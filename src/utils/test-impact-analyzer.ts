import { execSync } from 'child_process';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import { resolve, relative, dirname, join } from 'path';

interface TestImpactMapping {
  sourceFiles: Record<string, string[]>; // source file -> test files that cover it
  testFiles: Record<string, string[]>; // test file -> source files it covers
  categories: Record<string, string[]>; // category -> test files
}

interface ChangedFiles {
  modified: string[];
  added: string[];
  deleted: string[];
}

interface TestSelection {
  affected: string[];
  category: 'smoke' | 'core' | 'extended' | 'integration';
  estimatedTime: string;
  reason: string;
}

class TestImpactAnalyzer {
  private projectRoot: string;
  private mapping: TestImpactMapping;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.mapping = this.loadOrGenerateMapping();
  }

  /**
   * Get tests affected by current git changes
   */
  public getAffectedTests(baseBranch: string = 'main'): TestSelection {

    return this.categorizeTestSelection(affectedTests, changedFiles);
  }

  /**
   * Get changed files from git diff
   */
  private getChangedFiles(baseBranch: string): ChangedFiles {
    try {
      // Get changed files compared to base branch
        `git diff --name-status ${baseBranch}...HEAD`,
        {
          encoding: 'utf-8',
          cwd: this.projectRoot,
        }
      );

      const modified: string[] = [];
      const added: string[] = [];
      const deleted: string[] = [];

      diffOutput.split('\n').forEach((line) => {
        if (!line.trim()) return;

        const [status, ...fileParts] = line.split('\t');

        switch (status[0]) {
          case 'M':
            modified.push(file);
            break;
          case 'A':
            added.push(file);
            break;
          case 'D':
            deleted.push(file);
            break;
        }
      });

      return { modified, added, deleted };
    } catch (error) {
      console.warn('Failed to get git diff, analyzing all tests:', error);
      return { modified: [], added: [], deleted: [] };
    }
  }

  /**
   * Calculate which tests are affected by changed files
   */
  private calculateAffectedTests(changedFiles: ChangedFiles): string[] {

    // Find tests that directly cover changed source files
    allChangedFiles.forEach((file) => {
      if (this.mapping.sourceFiles[file]) {
        this.mapping.sourceFiles[file].forEach((testFile) => {
          affectedTests.add(testFile);
        });
      }
    });

    // If changed files include test files, add them directly
    allChangedFiles.forEach((file) => {
      if (file.includes('.test.') || file.includes('.spec.')) {
        affectedTests.add(file);
      }
    });

    return Array.from(affectedTests);
  }

  /**
   * Categorize test selection based on impact and changed files
   */
  private categorizeTestSelection(
    affectedTests: string[],
    changedFiles: ChangedFiles
  ): TestSelection {
      ...changedFiles.modified,
      ...changedFiles.added,
      ...changedFiles.deleted,
    ];

    // If only documentation changes
    if (this.isOnlyDocumentationChanges(allChangedFiles)) {
      return {
        affected: [],
        category: 'smoke',
        estimatedTime: '30s',
        reason: 'Documentation-only changes, running smoke tests for safety',
      };
    }

    // If no affected tests found, run smoke tests
    if (affectedTests.length === 0) {
      return {
        affected: this.mapping.categories.smoke || [],
        category: 'smoke',
        estimatedTime: '30s',
        reason: 'No specific tests affected, running smoke tests',
      };
    }

    // If only a few tests affected, run them + smoke
    if (affectedTests.length <= 5) {

      return {
        affected: allTests,
        category: 'core',
        estimatedTime: '2m',
        reason: `${affectedTests.length} tests affected, including smoke tests`,
      };
    }

    // If many tests affected or core service changes, run extended
    if (
      affectedTests.length > 10 ||
      this.hasCoreServiceChanges(allChangedFiles)
    ) {
      return {
        affected: this.mapping.categories.extended || [],
        category: 'extended',
        estimatedTime: '5m',
        reason: 'Significant changes detected, running extended test suite',
      };
    }

    // Default to core tests

    return {
      affected: combinedTests,
      category: 'core',
      estimatedTime: '2m',
      reason: `${affectedTests.length} tests affected, running core suite`,
    };
  }

  /**
   * Check if changes are only documentation
   */
  private isOnlyDocumentationChanges(files: string[]): boolean {
      '.md',
      '.txt',
      'docs/',
      'README',
      'CHANGELOG',
      'LICENSE',
    ];
    return (
      files.length > 0 &&
      files.every((file) =>
        docPatterns.some((pattern) => file.includes(pattern))
      )
    );
  }

  /**
   * Check if changes include core services
   */
  private hasCoreServiceChanges(files: string[]): boolean {
      'src/services/',
      'src/handlers/',
      'src/api/',
      'src/index.ts',
    ];
    return files.some((file) =>
      corePatterns.some((pattern) => file.includes(pattern))
    );
  }

  /**
   * Load or generate test-to-source file mapping
   */
  private loadOrGenerateMapping(): TestImpactMapping {
      this.projectRoot,
      'config',
      'test-impact-mapping.json'
    );

    if (existsSync(mappingFile)) {
      try {
        return JSON.parse(readFileSync(mappingFile, 'utf-8'));
      } catch (error) {
        console.warn('Failed to load test mapping, regenerating:', error);
      }
    }

    return this.generateMapping();
  }

  /**
   * Generate test impact mapping by analyzing imports and file relationships
   */
  private generateMapping(): TestImpactMapping {
    const mapping: TestImpactMapping = {
      sourceFiles: {},
      testFiles: {},
      categories: {
        smoke: this.getCriticalPathTests(),
        core: [],
        extended: [],
        integration: [],
      },
    };

    // Get all test files
      cwd: this.projectRoot,
    });

    testFiles.forEach((testFile) => {
      mapping.testFiles[testFile] = sourceFiles;

      // Reverse mapping: source file -> test files
      sourceFiles.forEach((sourceFile) => {
        if (!mapping.sourceFiles[sourceFile]) {
          mapping.sourceFiles[sourceFile] = [];
        }
        mapping.sourceFiles[sourceFile].push(testFile);
      });

      // Categorize tests
      this.categorizeTest(testFile, mapping.categories);
    });

    return mapping;
  }

  /**
   * Analyze imports in a test file to determine which source files it covers
   */
  private analyzeTestImports(testFile: string): string[] {
    const sourceFiles: string[] = [];

    try {

      imports.forEach((importLine) => {
        if (match) {
          let importPath = match[1];

          // Convert relative imports to actual file paths
          if (importPath.startsWith('.')) {
              join(this.projectRoot, testDir),
              importPath
            );
            importPath = relative(this.projectRoot, resolvedPath);
          }

          // Add .ts/.js extensions if missing
          if (!importPath.includes('.')) {

            if (existsSync(join(this.projectRoot, tsFile))) {
              importPath = tsFile;
            } else if (existsSync(join(this.projectRoot, jsFile))) {
              importPath = jsFile;
            }
          }

          // Only include source files (not test files or node_modules)
          if (importPath.startsWith('src/') && !importPath.includes('test')) {
            sourceFiles.push(importPath);
          }
        }
      });
    } catch (error) {
      console.warn(`Failed to analyze imports in ${testFile}:`, error);
    }

    return sourceFiles;
  }

  /**
   * Get critical path tests for smoke testing
   */
  private getCriticalPathTests(): string[] {
    // These are the most critical tests that must pass
      'test/services/UniversalCreateService.test.ts',
      'test/services/UniversalSearchService.test.ts',
      'test/handlers/tools.test.ts',
      'test/api/advanced-search.test.ts',
    ];

    return criticalTests.filter((test) =>
      existsSync(join(this.projectRoot, test))
    );
  }

  /**
   * Categorize a test based on its path and content
   */
  private categorizeTest(
    testFile: string,
    categories: Record<string, string[]>
  ): void {
    // Integration tests
    if (testFile.includes('integration/') || testFile.includes('e2e/')) {
      categories.integration.push(testFile);
      return;
    }

    // Core service tests
    if (testFile.includes('services/') || testFile.includes('handlers/')) {
      categories.core.push(testFile);
      return;
    }

    // Extended tests (API, objects, utils)
    if (
      testFile.includes('api/') ||
      testFile.includes('objects/') ||
      testFile.includes('utils/')
    ) {
      categories.extended.push(testFile);
      return;
    }

    // Default to extended
    categories.extended.push(testFile);
  }

  /**
   * Save the mapping to disk for future use
   */
  public saveMapping(): void {
      this.projectRoot,
      'config',
      'test-impact-mapping.json'
    );

    if (!existsSync(mappingDir)) {
      mkdirSync(mappingDir, { recursive: true });
    }

    writeFileSync(mappingFile, JSON.stringify(this.mapping, null, 2));
  }

  /**
   * Generate a report of the test impact analysis
   */
  public generateReport(baseBranch: string = 'main'): string {

    let report = '# Test Impact Analysis Report\n\n';
    report += `**Base Branch**: ${baseBranch}\n`;
    report += `**Category**: ${selection.category}\n`;
    report += `**Estimated Time**: ${selection.estimatedTime}\n`;
    report += `**Reason**: ${selection.reason}\n\n`;

    report += '## Changed Files\n';
    report += `- Modified: ${changedFiles.modified.length}\n`;
    report += `- Added: ${changedFiles.added.length}\n`;
    report += `- Deleted: ${changedFiles.deleted.length}\n\n`;

    if (changedFiles.modified.length > 0) {
      report += '### Modified Files\n';
      changedFiles.modified.forEach((file) => {
        report += `- ${file}\n`;
      });
      report += '\n';
    }

    report += '## Affected Tests\n';
    if (selection.affected.length === 0) {
      report += 'No specific tests affected.\n';
    } else {
      selection.affected.forEach((test) => {
        report += `- ${test}\n`;
      });
    }

    return report;
  }
}

// Export for use as a module
export { TestImpactAnalyzer };
