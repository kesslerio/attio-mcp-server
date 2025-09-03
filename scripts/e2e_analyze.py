#!/usr/bin/env python3

import argparse
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone

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
        'failures': []
    }

    try:
        with open(log_file, 'r') as f:
            for line in f:
                if '✓ test/' in line:
                    stats['passed'] += 1
                elif '✗ test/' in line:
                    stats['failed'] += 1
                    stats['failures'].append(line.strip())
                elif 'skipped (' in line:
                    stats['skipped'] += 1
                
                if 'Duration:' in line:
                    match = re.search(r'Duration: (\d+)s', line)
                    if match:
                        stats['duration'] = int(match.group(1))

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

def generate_text_report(all_stats, args):
    """Generates a human-readable report to the console."""
    total_files = len(all_stats)
    total_passed = sum(s['passed'] for s in all_stats.values())
    total_failed = sum(s['failed'] for s in all_stats.values())
    total_skipped = sum(s['skipped'] for s in all_stats.values())
    total_tests = total_passed + total_failed + total_skipped

    print("\n📈 Summary Report")
    print("=================")
    print(f"Files analyzed: {total_files}")
    print(f"Total tests: {total_tests}")
    print(f"✅ Passed: {total_passed}")
    print(f"❌ Failed: {total_failed}")
    print(f"⏸ Skipped: {total_skipped}")
    
    success_rate = (total_passed / total_tests * 100) if total_tests > 0 else 0
    print(f"🎯 Success rate: {success_rate:.2f}%")

    if args.timing:
        total_duration = sum(s['duration'] for s in all_stats.values())
        avg_duration = total_duration / total_files if total_files > 0 else 0
        slowest_test = max(all_stats.items(), key=lambda item: item[1]['duration']) if all_stats else (None, {'duration': 0})
        
        print("\n⏱ Timing Analysis")
        print("=================")
        print(f"Total execution time: {total_duration}s")
        print(f"Average execution time: {avg_duration:.2f}s")
        if slowest_test[0]:
            print(f"Slowest test file: {os.path.basename(slowest_test[0])} ({slowest_test[1]['duration']}s)")

    if args.patterns:
        total_api_errors = sum(s['api_errors'] for s in all_stats.values())
        total_timeout_errors = sum(s['timeout_errors'] for s in all_stats.values())
        total_assertion_errors = sum(s['assertion_errors'] for s in all_stats.values())
        total_connection_errors = sum(s['connection_errors'] for s in all_stats.values())
        print("\n🔍 Error Patterns Analysis")
        print("==========================")
        print(f"🌐 API errors: {total_api_errors}")
        print(f"⏱ Timeout errors: {total_timeout_errors}")
        print(f"🔍 Assertion errors: {total_assertion_errors}")
        print(f"🔌 Connection errors: {total_connection_errors}")

    if args.failures_only and total_failed > 0:
        print("\n❌ Failed Test Details")
        print("=====================")
        for log_file, stats in all_stats.items():
            if stats['failed'] > 0:
                print(f"\n📁 {os.path.basename(log_file)}")
                for failure in stats['failures']:
                    print(f"  {failure}")

    if args.flaky:
        print("\n🤔 Flaky Test Detection")
        print("=====================")
        print("(Not yet implemented)")

def generate_json_report(all_stats):
    """Generates a JSON report."""
    report = {
        'analysis_timestamp': datetime.utcnow().isoformat() + 'Z',
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
        'file_details': {os.path.basename(f): v for f, v in all_stats.items()}
    }
    report['summary']['total_tests'] = report['summary']['total_passed'] + report['summary']['total_failed'] + report['summary']['total_skipped']
    success_rate = (report['summary']['total_passed'] / report['summary']['total_tests'] * 100) if report['summary']['total_tests'] > 0 else 0
    report['summary']['success_rate'] = f"{success_rate:.2f}%"

    return json.dumps(report, indent=2)

def main():
    parser = argparse.ArgumentParser(description='E2E Test Analysis Script.')
    parser.add_argument('log_path', nargs='?', default='test-results', help='Path to a log file or directory.')
    parser.add_argument('-r', '--recent', action='store_true', help='Analyze only recent logs (last 24h).')
    parser.add_argument('-f', '--failures-only', action='store_true', help='Show only failed tests.')
    parser.add_argument('-s', '--summary', action='store_true', help='Generate summary report.')
    parser.add_argument('-p', '--patterns', action='store_true', help='Extract common error patterns.')
    parser.add_argument('-t', '--timing', action='store_true', help='Include timing analysis.')
    parser.add_argument('-j', '--json', action='store_true', help='Output analysis in JSON format.')
    parser.add_argument('--flaky', action='store_true', help='Identify potentially flaky tests (Not yet implemented).')
    parser.add_argument('--export', help='Export report to a file.')

    args = parser.parse_args()

    log_files = []
    if os.path.isdir(args.log_path):
        for f in os.listdir(args.log_path):
            if f.startswith('e2e-') and f.endswith('.log'):
                file_path = os.path.join(args.log_path, f)
                if args.recent:
                    file_mod_time = datetime.fromtimestamp(os.path.getmtime(file_path))
                    if datetime.now() - file_mod_time > timedelta(hours=24):
                        continue
                log_files.append(file_path)
    elif os.path.isfile(args.log_path):
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

    output = ""
    if args.json:
        output = generate_json_report(all_stats)
    else:
        # Create a temporary file for the text report
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w+', delete=False) as tmp:
            original_stdout = sys.stdout
            sys.stdout = tmp
            generate_text_report(all_stats, args)
            sys.stdout = original_stdout
            tmp.seek(0)
            output = tmp.read()

    if args.export:
        with open(args.export, 'w') as f:
            f.write(output)
        print(f"✅ Report saved to: {args.export}")
    else:
        print(output)
    
    total_failed = sum(s['failed'] for s in all_stats.values())
    if total_failed > 0:
        sys.exit(1)

if __name__ == "__main__":
    main()