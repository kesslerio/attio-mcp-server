#!/usr/bin/env python3

import argparse
import json
import os
import re
import sys
import statistics
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple

def extract_test_details(log_file):
    """Extract individual test details from log file."""
    tests = []
    current_test = None
    
    try:
        with open(log_file, 'r') as f:
            content = f.read()
            
        # Extract test results with timing - format: ✓ test/path > Suite > Group > test name 123ms
        test_patterns = [
            r'✓ (test/.+?)\s+(\d+ms)',  # Passed tests
            r'✗ (test/.+?)\s+(\d+ms)',  # Failed tests (vitest format)
            r'FAIL\s+(test/.+?\.e2e\.test\.ts) >',  # Failed tests (FAIL format)
            r'- (test/.+?)\s+\(skipped\)',  # Skipped tests
        ]
        
        for line in content.split('\n'):
            # Look for test results
            for i, pattern in enumerate(test_patterns):
                match = re.search(pattern, line)
                if match:
                    test_name = match.group(1).strip()
                    if i == 0:  # Passed
                        duration_str = match.group(2)
                        duration_ms = parse_duration(duration_str)
                        tests.append({
                            'name': test_name,
                            'status': 'passed',
                            'duration_ms': duration_ms,
                            'duration_str': duration_str
                        })
                    elif i == 1:  # Failed (✗ format)
                        duration_str = match.group(2)
                        duration_ms = parse_duration(duration_str)
                        tests.append({
                            'name': test_name,
                            'status': 'failed',
                            'duration_ms': duration_ms,
                            'duration_str': duration_str
                        })
                    elif i == 2:  # Failed (FAIL format)
                        tests.append({
                            'name': test_name,
                            'status': 'failed',
                            'duration_ms': 0,  # Duration not available in FAIL format
                            'duration_str': '0ms'
                        })
                    elif i == 3:  # Skipped
                        tests.append({
                            'name': test_name,
                            'status': 'skipped',
                            'duration_ms': 0,
                            'duration_str': '0ms'
                        })
                    break
    except Exception as e:
        print(f"Error extracting test details from {log_file}: {e}", file=sys.stderr)
        
    return tests

def parse_duration(duration_str):
    """Parse duration string to milliseconds."""
    try:
        if 'ms' in duration_str:
            return float(duration_str.replace('ms', ''))
        elif 's' in duration_str:
            return float(duration_str.replace('s', '')) * 1000
        else:
            return float(duration_str)
    except:
        return 0

def extract_vitest_summary(log_file):
    """Extract test counts from vitest summary line."""
    try:
        with open(log_file, 'r') as f:
            content = f.read()
        
        # Look for vitest summary: "Tests  11 failed | 114 passed | 4 skipped (129)"
        summary_match = re.search(r'Tests\s+(\d+)\s+failed\s*\|\s*(\d+)\s+passed\s*\|\s*(\d+)\s+skipped', content)
        if summary_match:
            return {
                'failed': int(summary_match.group(1)),
                'passed': int(summary_match.group(2)),
                'skipped': int(summary_match.group(3))
            }
    except Exception as e:
        print(f"Error extracting vitest summary from {log_file}: {e}", file=sys.stderr)
    
    return None

def analyze_log_file(log_file):
    """Analyzes a single log file and returns a dictionary of its stats."""
    stats = {
        'passed': 0,
        'failed': 0,
        'skipped': 0,
        'duration': 0,
        'api_errors': 0,
        'timeout_errors': 0,
        'assertion_errors': 0,
        'connection_errors': 0,
        'failures': [],
        'tests': []  # Add individual test details
    }
    
    # Try to get accurate counts from vitest summary first
    summary = extract_vitest_summary(log_file)
    use_summary_counts = summary is not None
    
    if use_summary_counts:
        stats['passed'] = summary['passed']
        stats['failed'] = summary['failed'] 
        stats['skipped'] = summary['skipped']

    # Extract individual test details
    stats['tests'] = extract_test_details(log_file)
    
    try:
        with open(log_file, 'r') as f:
            content = f.read()
            
        # If no summary available, count tests by status from individual results
        if not use_summary_counts:
            for test in stats['tests']:
                if test['status'] == 'passed':
                    stats['passed'] += 1
                elif test['status'] == 'failed':
                    stats['failed'] += 1
                elif test['status'] == 'skipped':
                    stats['skipped'] += 1
        
        # Always build failures list for details
        for test in stats['tests']:
            if test['status'] == 'failed':
                stats['failures'].append(f"✗ {test['name']} ({test['duration_str']})")
        
        # Extract overall duration
        duration_match = re.search(r'Duration\s+(\d+\.\d+)s', content)
        if duration_match:
            stats['duration'] = float(duration_match.group(1))
        
        # Count error patterns
        for line in content.split('\n'):
            if 'API' in line and 'error' in line.lower():
                stats['api_errors'] += 1
            if 'timeout' in line.lower():
                stats['timeout_errors'] += 1
            if 'AssertionError' in line:
                stats['assertion_errors'] += 1
            if 'ECONNREFUSED' in line:
                stats['connection_errors'] += 1

    except FileNotFoundError:
        print(f"Error: Log file not found at {log_file}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"Error processing file {log_file}: {e}", file=sys.stderr)
        return None

    return stats

def generate_text_report(all_stats):
    """Generates a comprehensive, human-readable report."""
    report_lines = []
    total_files = len(all_stats)
    total_passed = sum(s['passed'] for s in all_stats.values())
    total_failed = sum(s['failed'] for s in all_stats.values())
    total_skipped = sum(s['skipped'] for s in all_stats.values())
    total_tests = total_passed + total_failed + total_skipped

    report_lines.append("\n📈 Summary Report")
    report_lines.append("=================")
    report_lines.append(f"Files analyzed: {total_files}")
    report_lines.append(f"Total tests: {total_tests}")
    report_lines.append(f"✅ Passed: {total_passed}")
    report_lines.append(f"❌ Failed: {total_failed}")
    report_lines.append(f"⏸ Skipped: {total_skipped}")
    
    success_rate = (total_passed / total_tests * 100) if total_tests > 0 else 0
    report_lines.append(f"🎯 Success rate: {success_rate:.2f}%")

    # Timing Analysis
    total_duration = sum(s['duration'] for s in all_stats.values())
    avg_duration = total_duration / total_files if total_files > 0 else 0
    slowest_test = max(all_stats.items(), key=lambda item: item[1]['duration']) if all_stats else (None, {'duration': 0})
    
    report_lines.append("\n⏱ Timing Analysis")
    report_lines.append("=================")
    report_lines.append(f"Total execution time: {total_duration:.2f}s")
    report_lines.append(f"Average execution time: {avg_duration:.2f}s")
    if slowest_test[0]:
        report_lines.append(f"Slowest test file: {os.path.basename(slowest_test[0])} ({slowest_test[1]['duration']:.2f}s)")

    # Error Patterns
    total_api_errors = sum(s['api_errors'] for s in all_stats.values())
    total_timeout_errors = sum(s['timeout_errors'] for s in all_stats.values())
    total_assertion_errors = sum(s['assertion_errors'] for s in all_stats.values())
    total_connection_errors = sum(s['connection_errors'] for s in all_stats.values())
    report_lines.append("\n🔍 Error Patterns Analysis")
    report_lines.append("==========================")
    report_lines.append(f"🌐 API errors: {total_api_errors}")
    report_lines.append(f"⏱ Timeout errors: {total_timeout_errors}")
    report_lines.append(f"🔍 Assertion errors: {total_assertion_errors}")
    report_lines.append(f"🔌 Connection errors: {total_connection_errors}")

    # Failure Details
    if total_failed > 0:
        report_lines.append("\n❌ Failed Test Details")
        report_lines.append("=====================")
        for log_file, stats in all_stats.items():
            if stats['failed'] > 0:
                report_lines.append(f"\n📁 {os.path.basename(log_file)}")
                for failure in stats['failures']:
                    report_lines.append(f"  {failure}")
    
    return "\n".join(report_lines)

def generate_json_report(all_stats):
    """Generates a JSON report."""
    report = {
        'analysis_timestamp': datetime.now(timezone.utc).isoformat(),
        'files_analyzed': len(all_stats),
        'summary': {
            'total_passed': sum(s['passed'] for s in all_stats.values()),
            'total_failed': sum(s['failed'] for s in all_stats.values()),
            'total_skipped': sum(s['skipped'] for s in all_stats.values()),
        },
        'error_patterns': {
            'api_errors': sum(s['api_errors'] for s in all_stats.values()),
            'timeout_errors': sum(s['timeout_errors'] for s in all_stats.values()),
            'assertion_errors': sum(s['assertion_errors'] for s in all_stats.values()),
            'connection_errors': sum(s['connection_errors'] for s in all_stats.values()),
        },
        'file_details': {os.path.basename(f): v for f, v in all_stats.items()},
        'all_tests': []
    }
    report['summary']['total_tests'] = report['summary']['total_passed'] + report['summary']['total_failed'] + report['summary']['total_skipped']
    success_rate = (report['summary']['total_passed'] / report['summary']['total_tests'] * 100) if report['summary']['total_tests'] > 0 else 0
    report['summary']['success_rate'] = f"{success_rate:.2f}%"
    
    # Collect all individual tests
    all_tests = []
    for log_file, stats in all_stats.items():
        for test in stats.get('tests', []):
            test_copy = test.copy()
            test_copy['log_file'] = os.path.basename(log_file)
            all_tests.append(test_copy)
    
    # Sort by duration (longest first) and add to report
    report['all_tests'] = sorted(all_tests, key=lambda x: x['duration_ms'], reverse=True)

    return json.dumps(report, indent=2)

def load_historical_data(data_dir: str = "test-results") -> List[Dict]:
    """Load historical test data for baseline comparison."""
    history_file = os.path.join(data_dir, "e2e-history.json")
    if not os.path.exists(history_file):
        return []
    
    try:
        with open(history_file, 'r') as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        return []

def save_historical_data(stats: Dict, data_dir: str = "test-results") -> None:
    """Save current stats to historical data."""
    history_file = os.path.join(data_dir, "e2e-history.json")
    history = load_historical_data(data_dir)
    
    # Add timestamp and flatten stats for storage
    record = {
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'total_tests': sum(s['passed'] + s['failed'] + s['skipped'] for s in stats.values()),
        'total_passed': sum(s['passed'] for s in stats.values()),
        'total_failed': sum(s['failed'] for s in stats.values()),
        'total_skipped': sum(s['skipped'] for s in stats.values()),
        'success_rate': (sum(s['passed'] for s in stats.values()) / max(sum(s['passed'] + s['failed'] + s['skipped'] for s in stats.values()), 1)) * 100,
        'api_errors': sum(s['api_errors'] for s in stats.values()),
        'timeout_errors': sum(s['timeout_errors'] for s in stats.values()),
        'assertion_errors': sum(s['assertion_errors'] for s in stats.values()),
        'connection_errors': sum(s['connection_errors'] for s in stats.values()),
        'total_duration': sum(s['duration'] for s in stats.values()),
        'files_analyzed': len(stats),
        'failures': [failure for s in stats.values() for failure in s['failures']]
    }
    
    history.append(record)
    
    # Keep only last 30 days of data
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=30)
    history = [h for h in history if datetime.fromisoformat(h['timestamp'].replace('Z', '+00:00')) > cutoff_date]
    
    os.makedirs(data_dir, exist_ok=True)
    with open(history_file, 'w') as f:
        json.dump(history, f, indent=2)

def calculate_baseline(history: List[Dict], days: int = 7) -> Dict:
    """Calculate baseline metrics from recent history."""
    if not history:
        return {}
    
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
    recent_history = [h for h in history if datetime.fromisoformat(h['timestamp'].replace('Z', '+00:00')) > cutoff_date]
    
    if not recent_history:
        return {}
    
    return {
        'avg_success_rate': statistics.mean([h['success_rate'] for h in recent_history]),
        'avg_api_errors': statistics.mean([h['api_errors'] for h in recent_history]),
        'avg_timeout_errors': statistics.mean([h['timeout_errors'] for h in recent_history]),
        'avg_assertion_errors': statistics.mean([h['assertion_errors'] for h in recent_history]),
        'avg_connection_errors': statistics.mean([h['connection_errors'] for h in recent_history]),
        'avg_duration': statistics.mean([h['total_duration'] for h in recent_history]),
        'sample_size': len(recent_history)
    }

def detect_anomalies(current_stats: Dict, baseline: Dict) -> List[Dict]:
    """Detect anomalies by comparing current stats to baseline."""
    anomalies = []
    
    if not baseline:
        return anomalies
    
    # Calculate current totals
    current_totals = {
        'success_rate': (sum(s['passed'] for s in current_stats.values()) / max(sum(s['passed'] + s['failed'] + s['skipped'] for s in current_stats.values()), 1)) * 100,
        'api_errors': sum(s['api_errors'] for s in current_stats.values()),
        'timeout_errors': sum(s['timeout_errors'] for s in current_stats.values()),
        'assertion_errors': sum(s['assertion_errors'] for s in current_stats.values()),
        'connection_errors': sum(s['connection_errors'] for s in current_stats.values()),
        'duration': sum(s['duration'] for s in current_stats.values())
    }
    
    # Define thresholds for anomaly detection
    thresholds = {
        'success_rate': 15,  # 15% drop in success rate
        'api_errors': 100,    # 100% increase in API errors
        'timeout_errors': 100, # 100% increase in timeout errors
        'assertion_errors': 50, # 50% increase in assertion errors
        'connection_errors': 200, # 200% increase in connection errors  
        'duration': 50       # 50% increase in duration
    }
    
    # Check for success rate drops
    if 'avg_success_rate' in baseline:
        success_drop = baseline['avg_success_rate'] - current_totals['success_rate']
        if success_drop > thresholds['success_rate']:
            anomalies.append({
                'type': 'success_rate_drop',
                'severity': 'high' if success_drop > 25 else 'medium',
                'message': f"Success rate dropped {success_drop:.1f}% (current: {current_totals['success_rate']:.1f}%, baseline: {baseline['avg_success_rate']:.1f}%)",
                'current': current_totals['success_rate'],
                'baseline': baseline['avg_success_rate']
            })
    
    # Check for error increases
    for error_type in ['api_errors', 'timeout_errors', 'assertion_errors', 'connection_errors']:
        if f'avg_{error_type}' in baseline and baseline[f'avg_{error_type}'] > 0:
            current_value = current_totals[error_type]
            baseline_value = baseline[f'avg_{error_type}']
            increase_pct = ((current_value - baseline_value) / baseline_value) * 100
            
            if increase_pct > thresholds[error_type]:
                anomalies.append({
                    'type': f'{error_type}_spike',
                    'severity': 'high' if increase_pct > 200 else 'medium',
                    'message': f"{error_type.replace('_', ' ').title()} increased {increase_pct:.0f}% (current: {current_value}, baseline: {baseline_value:.1f})",
                    'current': current_value,
                    'baseline': baseline_value,
                    'increase_pct': increase_pct
                })
    
    # Check for duration increases
    if 'avg_duration' in baseline and baseline['avg_duration'] > 0:
        duration_increase = ((current_totals['duration'] - baseline['avg_duration']) / baseline['avg_duration']) * 100
        if duration_increase > thresholds['duration']:
            anomalies.append({
                'type': 'duration_increase',
                'severity': 'medium' if duration_increase < 100 else 'high',
                'message': f"Test duration increased {duration_increase:.0f}% (current: {current_totals['duration']:.1f}s, baseline: {baseline['avg_duration']:.1f}s)",
                'current': current_totals['duration'],
                'baseline': baseline['avg_duration'],
                'increase_pct': duration_increase
            })
    
    return anomalies

def detect_flaky_tests(history: List[Dict], days: int = 7) -> List[Dict]:
    """Detect potentially flaky tests from failure patterns."""
    if len(history) < 3:  # Need at least 3 runs to detect flakiness
        return []
    
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
    recent_history = [h for h in history if datetime.fromisoformat(h['timestamp'].replace('Z', '+00:00')) > cutoff_date]
    
    if len(recent_history) < 3:
        return []
    
    # Analyze failure patterns - look for tests that fail intermittently
    all_failures = []
    for h in recent_history:
        all_failures.extend(h.get('failures', []))
    
    # Count failure frequency for each test
    failure_counts = {}
    for failure in all_failures:
        # Extract test name from failure message
        test_match = re.search(r'test/[^:]+', failure)
        if test_match:
            test_name = test_match.group(0)
            failure_counts[test_name] = failure_counts.get(test_name, 0) + 1
    
    # Identify potentially flaky tests (failed in multiple runs but not all)
    flaky_tests = []
    total_runs = len(recent_history)
    
    for test, failures in failure_counts.items():
        failure_rate = failures / total_runs
        if 0.2 <= failure_rate <= 0.8:  # Failed in 20-80% of runs (flaky range)
            flaky_tests.append({
                'test': test,
                'failures': failures,
                'total_runs': total_runs,
                'failure_rate': failure_rate * 100,
                'severity': 'high' if failure_rate >= 0.5 else 'medium'
            })
    
    return sorted(flaky_tests, key=lambda x: x['failure_rate'], reverse=True)

def generate_enhanced_text_report(all_stats: Dict, anomalies: List[Dict], flaky_tests: List[Dict], baseline: Dict) -> str:
    """Generate an enhanced report with anomaly detection and trend analysis."""
    report_lines = []
    
    # Basic summary
    total_files = len(all_stats)
    total_passed = sum(s['passed'] for s in all_stats.values())
    total_failed = sum(s['failed'] for s in all_stats.values())
    total_skipped = sum(s['skipped'] for s in all_stats.values())
    total_tests = total_passed + total_failed + total_skipped
    success_rate = (total_passed / total_tests * 100) if total_tests > 0 else 0
    
    report_lines.append("\n📈 Enhanced E2E Analysis Report")
    report_lines.append("================================")
    report_lines.append(f"Files analyzed: {total_files}")
    report_lines.append(f"Total tests: {total_tests}")
    report_lines.append(f"✅ Passed: {total_passed}")
    report_lines.append(f"❌ Failed: {total_failed}")
    report_lines.append(f"⏸ Skipped: {total_skipped}")
    report_lines.append(f"🎯 Success rate: {success_rate:.2f}%")
    
    # Per-test breakdown
    report_lines.append("\n📋 Per-Test Breakdown")
    report_lines.append("====================")
    
    for log_file, stats in all_stats.items():
        if stats['tests']:
            file_name = os.path.basename(log_file)
            report_lines.append(f"\n📁 {file_name} ({len(stats['tests'])} tests)")
            
            # Sort tests by duration (longest first)
            sorted_tests = sorted(stats['tests'], key=lambda x: x['duration_ms'], reverse=True)
            
            for test in sorted_tests:
                status_icon = {
                    'passed': '✅',
                    'failed': '❌', 
                    'skipped': '⏸'
                }.get(test['status'], '❓')
                
                # Extract just the test name (remove path prefix)
                test_display_name = test['name'].replace('test/e2e/suites/', '').replace('.e2e.test.ts > ', ' > ')
                
                report_lines.append(f"  {status_icon} {test_display_name} ({test['duration_str']})")
    
    # Show slowest tests overall
    all_tests = []
    for stats in all_stats.values():
        all_tests.extend(stats['tests'])
    
    if all_tests:
        slowest_tests = sorted(all_tests, key=lambda x: x['duration_ms'], reverse=True)[:10]
        report_lines.append(f"\n🐌 Slowest Tests (Top 10)")
        report_lines.append("========================")
        
        for i, test in enumerate(slowest_tests, 1):
            test_name = test['name'].replace('test/e2e/suites/', '').replace('.e2e.test.ts', '')
            status_icon = '✅' if test['status'] == 'passed' else '❌' if test['status'] == 'failed' else '⏸'
            report_lines.append(f"  {i:2d}. {status_icon} {test_name} ({test['duration_str']})")
    
    # Baseline comparison
    if baseline:
        report_lines.append(f"\n📊 Baseline Comparison (last {baseline.get('sample_size', 0)} runs)")
        report_lines.append("=" * 50)
        
        baseline_success = baseline.get('avg_success_rate', 0)
        success_diff = success_rate - baseline_success
        trend_icon = "📈" if success_diff > 0 else "📉" if success_diff < 0 else "➡️"
        
        report_lines.append(f"{trend_icon} Success rate: {success_rate:.2f}% (baseline: {baseline_success:.2f}%, diff: {success_diff:+.1f}%)")
        
        # Error comparisons
        current_errors = {
            'API': sum(s['api_errors'] for s in all_stats.values()),
            'Timeout': sum(s['timeout_errors'] for s in all_stats.values()),
            'Assertion': sum(s['assertion_errors'] for s in all_stats.values()),
            'Connection': sum(s['connection_errors'] for s in all_stats.values())
        }
        
        for error_type, current_count in current_errors.items():
            baseline_key = f"avg_{error_type.lower()}_errors"
            baseline_count = baseline.get(baseline_key, 0)
            if baseline_count > 0:
                change_pct = ((current_count - baseline_count) / baseline_count) * 100
                trend_icon = "🔴" if change_pct > 50 else "🟡" if change_pct > 0 else "🟢"
                report_lines.append(f"{trend_icon} {error_type} errors: {current_count} (baseline: {baseline_count:.1f}, change: {change_pct:+.0f}%)")
            else:
                report_lines.append(f"➡️ {error_type} errors: {current_count} (baseline: {baseline_count:.1f})")
    
    # Anomaly alerts
    if anomalies:
        report_lines.append(f"\n🚨 Anomaly Alerts ({len(anomalies)} detected)")
        report_lines.append("=" * 40)
        
        high_severity = [a for a in anomalies if a['severity'] == 'high']
        medium_severity = [a for a in anomalies if a['severity'] == 'medium']
        
        if high_severity:
            report_lines.append("🔴 High Severity:")
            for anomaly in high_severity:
                report_lines.append(f"  • {anomaly['message']}")
        
        if medium_severity:
            report_lines.append("🟡 Medium Severity:")
            for anomaly in medium_severity:
                report_lines.append(f"  • {anomaly['message']}")
    else:
        report_lines.append("\n✅ No Anomalies Detected")
        report_lines.append("=" * 25)
        report_lines.append("All metrics are within normal ranges compared to baseline.")
    
    # Flaky test detection
    if flaky_tests:
        report_lines.append(f"\n🤔 Potentially Flaky Tests ({len(flaky_tests)} detected)")
        report_lines.append("=" * 50)
        
        for test in flaky_tests[:5]:  # Show top 5 flaky tests
            severity_icon = "🔴" if test['severity'] == 'high' else "🟡"
            report_lines.append(f"{severity_icon} {test['test']}: {test['failures']}/{test['total_runs']} runs failed ({test['failure_rate']:.1f}%)")
        
        if len(flaky_tests) > 5:
            report_lines.append(f"  ... and {len(flaky_tests) - 5} more")
    
    # Standard timing and error analysis (condensed)
    total_duration = sum(s['duration'] for s in all_stats.values())
    report_lines.append(f"\n⏱ Performance: {total_duration:.2f}s total")
    
    if total_failed > 0:
        report_lines.append(f"\n❌ Recent Failures ({total_failed} tests)")
        report_lines.append("=" * 30)
        failure_count = 0
        for log_file, stats in all_stats.items():
            if stats['failed'] > 0:
                for failure in stats['failures'][:3]:  # Show first 3 failures per file
                    report_lines.append(f"  {failure}")
                    failure_count += 1
                    if failure_count >= 10:  # Limit to 10 total failures shown
                        break
                if failure_count >= 10:
                    break
        
        if sum(len(s['failures']) for s in all_stats.values()) > 10:
            report_lines.append(f"  ... and {sum(len(s['failures']) for s in all_stats.values()) - 10} more failures")
    
    return "\n".join(report_lines)

def main():
    parser = argparse.ArgumentParser(
        description='Enhanced E2E Test Analysis Script with anomaly detection and trend analysis.',
        epilog='''
EXAMPLES:
  Basic Analysis:
    %(prog)s                                   # Analyze all logs in test-results/
    %(prog)s test-results/e2e-core.log        # Analyze specific log file
    
  Enhanced Analysis:
    %(prog)s --enhanced --stdout               # Enhanced analysis to console
    %(prog)s --json --stdout                   # JSON output to console
    %(prog)s --export analysis.md             # Save to specific file
    
  Trend Analysis:
    %(prog)s --baseline-days 14               # 14-day baseline comparison
    %(prog)s --flaky-days 14                  # 14-day flaky test detection
    
  Integration with Diagnostics:
    ./scripts/e2e-diagnostics.sh --json | %(prog)s --stdin --enhanced --stdout
    
  Quick Latest Run Analysis:
    %(prog)s --latest --stdout                # Analyze most recent log only
    %(prog)s test-results --latest --enhanced # Enhanced analysis of latest log
    
OUTPUT OPTIONS:
  --stdout         Console output (good for piping)
  --export FILE    Save to specific file
  (default)        Auto-generated timestamped file in test-results/

ANALYSIS MODES:
  --enhanced       Full analysis with anomalies & flaky test detection (DEFAULT)
  --basic          Simple test counts and failures only
  --json           JSON format instead of human-readable markdown
  
HISTORICAL DATA:
  --no-save        Don't update historical baseline data
  --baseline-days  Days of history for baseline comparison (default: 7)
  --flaky-days     Days of history for flaky test detection (default: 7)
        ''',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument('log_path', nargs='?', default='test-results', 
                       help='Path to log file or directory (default: test-results/)')
    parser.add_argument('-j', '--json', action='store_true', 
                       help='Output in JSON format instead of markdown')
    parser.add_argument('--export', metavar='FILE',
                       help='Save report to specific file (auto-generated if not specified)')
    parser.add_argument('--stdout', action='store_true', 
                       help='Print to console instead of saving to file')
    parser.add_argument('--enhanced', action='store_true', default=True, 
                       help='Enhanced analysis with anomalies & flaky tests (DEFAULT)')
    parser.add_argument('--basic', action='store_true',
                       help='Basic analysis only (disable anomaly detection)')
    parser.add_argument('--latest', action='store_true',
                       help='Analyze only the most recent log file')
    parser.add_argument('--stdin', action='store_true',
                       help='Read log data from stdin (for piping from diagnostics)')
    parser.add_argument('--no-save', action='store_true', 
                       help='Don\'t save results to historical baseline data')
    parser.add_argument('--baseline-days', type=int, default=7, metavar='N',
                       help='Days of history for baseline comparison (default: 7)')
    parser.add_argument('--flaky-days', type=int, default=7, metavar='N',
                       help='Days of history for flaky test detection (default: 7)')

    args = parser.parse_args()
    
    # Handle conflicting options
    if args.basic:
        args.enhanced = False

    log_files = []
    is_single_file = False

    if args.stdin:
        # Read from stdin and write to temporary file for processing
        import tempfile
        stdin_content = sys.stdin.read()
        temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.log', delete=False)
        temp_file.write(stdin_content)
        temp_file.close()
        log_files.append(temp_file.name)
        is_single_file = True
    else:
        is_single_file = os.path.isfile(args.log_path)

        if os.path.isdir(args.log_path):
            # Find all log files
            all_log_files = []
            for f in os.listdir(args.log_path):
                if f.startswith('e2e-') and f.endswith('.log'):
                    full_path = os.path.join(args.log_path, f)
                    all_log_files.append((full_path, os.path.getmtime(full_path)))
            
            # Sort by modification time (newest first)
            all_log_files.sort(key=lambda x: x[1], reverse=True)
            
            if args.latest and all_log_files:
                # Only use the most recent log file
                log_files.append(all_log_files[0][0])
                is_single_file = True
            else:
                # Use all log files
                log_files = [f[0] for f in all_log_files]
                
        elif is_single_file:
            log_files.append(args.log_path)
        else:
            print(f"Error: Log path '{args.log_path}' not found.", file=sys.stderr)
            sys.exit(1)

    if not log_files:
        print("No log files found to analyze.")
        sys.exit(0)

    all_stats = {}
    for log_file in sorted(log_files):
        stats = analyze_log_file(log_file)
        if stats:
            all_stats[log_file] = stats

    # Load historical data and calculate baseline
    log_dir = args.log_path if os.path.isdir(args.log_path) else os.path.dirname(args.log_path)
    history = load_historical_data(log_dir)
    baseline = calculate_baseline(history, args.baseline_days)
    
    # Detect anomalies and flaky tests
    anomalies = detect_anomalies(all_stats, baseline) if args.enhanced else []
    flaky_tests = detect_flaky_tests(history, args.flaky_days) if args.enhanced else []
    
    # Save current results to history (unless disabled)
    if not args.no_save and all_stats:
        save_historical_data(all_stats, log_dir)
    
    # Generate output
    if args.json:
        # Enhanced JSON report with anomalies and flaky tests
        json_report = json.loads(generate_json_report(all_stats))
        json_report['anomalies'] = anomalies
        json_report['flaky_tests'] = flaky_tests
        json_report['baseline'] = baseline
        json_report['enhanced_analysis'] = args.enhanced
        output = json.dumps(json_report, indent=2)
    else:
        output = generate_enhanced_text_report(all_stats, anomalies, flaky_tests, baseline) if args.enhanced else generate_text_report(all_stats)

    if args.stdout:
        print(output)
    else:
        output_file = args.export
        if not output_file:
            # Determine output directory
            log_dir = args.log_path if os.path.isdir(args.log_path) else os.path.dirname(args.log_path)
            if not log_dir or log_dir == '.':
                log_dir = 'test-results'
            
            # Ensure output goes to test-results or specified log directory
            os.makedirs(log_dir, exist_ok=True)
            
            if is_single_file:
                base_name = os.path.basename(args.log_path).replace('.log', '')
                output_file = os.path.join(log_dir, f"analysis-{base_name}.md")
            else:
                timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
                output_file = os.path.join(log_dir, f"test-analysis-report-{timestamp}.md")
            
            if args.json:
                output_file = output_file.replace('.md', '.json')
        else:
            # If export path is specified, ensure it's in test-results if it's just a filename
            if not os.path.dirname(args.export):
                log_dir = args.log_path if os.path.isdir(args.log_path) else os.path.dirname(args.log_path)
                if not log_dir or log_dir == '.':
                    log_dir = 'test-results'
                os.makedirs(log_dir, exist_ok=True)
                output_file = os.path.join(log_dir, args.export)
            else:
                output_file = args.export

        with open(output_file, 'w') as f:
            f.write(output)
        print(f"✅ Report saved to: {output_file}")

    # Clean up temporary file if using stdin
    if args.stdin:
        os.unlink(log_files[0])
    
    total_failed = sum(s['failed'] for s in all_stats.values())
    if total_failed > 0:
        sys.exit(1)

if __name__ == "__main__":
    main()
