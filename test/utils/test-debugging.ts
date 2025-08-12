/**
 * Test Data Debugging and Validation Utilities
 *
 * Comprehensive utilities for E2E test debugging, data validation,
 * and error analysis to achieve 100% test success rate.
 *
 * Created for Issue #480 Phase 3: E2E Test Coverage & Validation
 */

import type { AttioTask, AttioRecord } from '../../src/types/attio.js';
import { TestEnvironment } from './mock-factories/test-environment.js';

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  fieldCoverage: number;
  missingRequiredFields: string[];
}

/**
 * Test data comparison result
 */
export interface ComparisonResult {
  match: boolean;
  differences: {
    field: string;
    expected: any;
    actual: any;
    reason: string;
  }[];
  score: number; // 0-1 compatibility score
}

/**
 * Mock factory validation report
 */
export interface FactoryValidationReport {
  taskFactory: ValidationResult;
  companyFactory: ValidationResult;
  personFactory: ValidationResult;
  listFactory: ValidationResult;
  overallScore: number;
  criticalIssues: string[];
}

/**
 * Test environment diagnostic report
 */
export interface DiagnosticReport {
  environmentDetection: {
    isTest: boolean;
    testType: string;
    useMocks: boolean;
    isCI: boolean;
  };
  mockFactoryStatus: FactoryValidationReport;
  apiMockStatus: {
    configured: boolean;
    responding: boolean;
    errorRate: number;
  };
  testDataCleanup: {
    tracking: boolean;
    leakageDetected: boolean;
    orphanedRecords: number;
  };
  recommendations: string[];
}

/**
 * Test Data Inspector - Validates data structures and identifies issues
 */
export class TestDataInspector {
  /**
   * Validates task structure against E2E test expectations
   */
  static validateTaskStructure(task: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const requiredFields = ['id', 'content', 'status', 'created_at'];
    const missingRequiredFields: string[] = [];

    // Check basic structure
    if (!task || typeof task !== 'object') {
      errors.push('Task must be a valid object');
      return {
        valid: false,
        errors,
        warnings,
        fieldCoverage: 0,
        missingRequiredFields,
      };
    }

    // Issue #480 specific validations
    if (!task.content && !task.title) {
      errors.push(
        'Task must have either content or title field (Issue #480 compatibility)'
      );
    }

    if (task.id && !task.id.task_id) {
      errors.push(
        'Task ID must include task_id field (Issue #480 compatibility)'
      );
    }

    if (task.id && !task.id.record_id) {
      errors.push('Task ID must include record_id field');
    }

    // Check required fields
    requiredFields.forEach((field) => {
      if (!task[field]) {
        missingRequiredFields.push(field);
      }
    });

    // Check status validity
    if (
      task.status &&
      !['pending', 'completed', 'in_progress', 'cancelled'].includes(
        task.status
      )
    ) {
      warnings.push(`Unusual task status: ${task.status}`);
    }

    // Check date format
    if (task.created_at && isNaN(new Date(task.created_at).getTime())) {
      errors.push('created_at must be valid ISO date string');
    }

    if (
      task.due_date &&
      task.due_date !== null &&
      isNaN(new Date(task.due_date).getTime())
    ) {
      errors.push('due_date must be valid ISO date string or null');
    }

    // Check assignee structure
    if (task.assignee && (!task.assignee.id || !task.assignee.type)) {
      errors.push('Assignee must have id and type fields');
    }

    // Check linked records
    if (task.linked_records && Array.isArray(task.linked_records)) {
      task.linked_records.forEach((record: any, index: number) => {
        if (!record.id || !record.object_slug) {
          errors.push(
            `Linked record ${index} missing required id or object_slug`
          );
        }
      });
    }

    const fieldCoverage = this.calculateFieldCoverage(task, [
      'id',
      'content',
      'title',
      'status',
      'created_at',
      'updated_at',
      'due_date',
      'assignee',
      'linked_records',
    ]);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      fieldCoverage,
      missingRequiredFields,
    };
  }

  /**
   * Validates company structure
   */
  static validateCompanyStructure(company: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const requiredFields = ['id', 'values'];
    const missingRequiredFields: string[] = [];

    if (!company || typeof company !== 'object') {
      errors.push('Company must be a valid object');
      return {
        valid: false,
        errors,
        warnings,
        fieldCoverage: 0,
        missingRequiredFields,
      };
    }

    // Check ID structure
    if (!company.id) {
      missingRequiredFields.push('id');
    } else if (!company.id.record_id || !company.id.workspace_id) {
      errors.push('Company ID must include record_id and workspace_id');
    }

    // Check values structure
    if (!company.values) {
      missingRequiredFields.push('values');
    } else if (typeof company.values !== 'object') {
      errors.push('Company values must be an object');
    }

    const fieldCoverage = this.calculateFieldCoverage(company, [
      'id',
      'values',
      'created_at',
      'web_url',
    ]);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      fieldCoverage,
      missingRequiredFields,
    };
  }

  /**
   * Validates person structure
   */
  static validatePersonStructure(person: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const requiredFields = ['id', 'values'];
    const missingRequiredFields: string[] = [];

    if (!person || typeof person !== 'object') {
      errors.push('Person must be a valid object');
      return {
        valid: false,
        errors,
        warnings,
        fieldCoverage: 0,
        missingRequiredFields,
      };
    }

    // Check ID structure - similar to company but for person
    if (!person.id) {
      missingRequiredFields.push('id');
    } else if (!person.id.record_id || !person.id.workspace_id) {
      errors.push('Person ID must include record_id and workspace_id');
    }

    // Check values structure
    if (!person.values) {
      missingRequiredFields.push('values');
    }

    const fieldCoverage = this.calculateFieldCoverage(person, [
      'id',
      'values',
      'created_at',
      'web_url',
    ]);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      fieldCoverage,
      missingRequiredFields,
    };
  }

  /**
   * Compares actual data with expected test structure
   */
  static compareWithExpectedStructure(
    actual: any,
    expected: any
  ): ComparisonResult {
    const differences: ComparisonResult['differences'] = [];
    let matches = 0;
    let total = 0;

    const compareFields = (actualObj: any, expectedObj: any, path = '') => {
      const expectedKeys = Object.keys(expectedObj);

      for (const key of expectedKeys) {
        total++;
        const currentPath = path ? `${path}.${key}` : key;

        if (!(key in actualObj)) {
          differences.push({
            field: currentPath,
            expected: expectedObj[key],
            actual: undefined,
            reason: 'Field missing from actual object',
          });
        } else if (
          typeof expectedObj[key] === 'object' &&
          expectedObj[key] !== null
        ) {
          if (typeof actualObj[key] !== 'object' || actualObj[key] === null) {
            differences.push({
              field: currentPath,
              expected: expectedObj[key],
              actual: actualObj[key],
              reason: 'Type mismatch - expected object',
            });
          } else {
            // Recursive comparison
            compareFields(actualObj[key], expectedObj[key], currentPath);
          }
        } else if (actualObj[key] !== expectedObj[key]) {
          differences.push({
            field: currentPath,
            expected: expectedObj[key],
            actual: actualObj[key],
            reason: 'Value mismatch',
          });
        } else {
          matches++;
        }
      }
    };

    compareFields(actual, expected);

    const score = total > 0 ? matches / total : 1;

    return {
      match: differences.length === 0,
      differences,
      score,
    };
  }

  /**
   * Validates error message format against expected patterns
   */
  static validateErrorMessage(
    errorMessage: string,
    expectedPattern: RegExp
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!errorMessage) {
      errors.push('Error message is empty or undefined');
      return {
        valid: false,
        errors,
        warnings,
        fieldCoverage: 0,
        missingRequiredFields: [],
      };
    }

    if (!expectedPattern.test(errorMessage)) {
      errors.push(
        `Error message "${errorMessage}" does not match expected pattern ${expectedPattern}`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      fieldCoverage: 1,
      missingRequiredFields: [],
    };
  }

  /**
   * Calculates field coverage percentage
   */
  private static calculateFieldCoverage(
    obj: any,
    expectedFields: string[]
  ): number {
    if (!obj || expectedFields.length === 0) return 0;

    const presentFields = expectedFields.filter((field) => {
      // Handle nested field paths like 'id.record_id'
      if (field.includes('.')) {
        const parts = field.split('.');
        let current = obj;
        for (const part of parts) {
          if (
            current &&
            current[part] !== undefined &&
            current[part] !== null
          ) {
            current = current[part];
          } else {
            return false;
          }
        }
        return true;
      }
      return obj[field] !== undefined && obj[field] !== null;
    });

    return presentFields.length / expectedFields.length;
  }
}

/**
 * Mock Data Validator - Validates all mock factories
 */
export class MockDataValidator {
  /**
   * Validates all mock factories and returns comprehensive report
   */
  static validateAllFactories(): FactoryValidationReport {
    const taskFactory = this.validateTaskFactory();
    const companyFactory = this.validateCompanyFactory();
    const personFactory = this.validatePersonFactory();
    const listFactory = this.validateListFactory();

    const overallScore =
      (taskFactory.fieldCoverage +
        companyFactory.fieldCoverage +
        personFactory.fieldCoverage +
        listFactory.fieldCoverage) /
      4;

    const criticalIssues: string[] = [];

    // Collect critical issues
    [taskFactory, companyFactory, personFactory, listFactory].forEach(
      (result) => {
        result.errors.forEach((error) => {
          if (error.includes('Issue #480') || error.includes('required')) {
            criticalIssues.push(error);
          }
        });
      }
    );

    return {
      taskFactory,
      companyFactory,
      personFactory,
      listFactory,
      overallScore,
      criticalIssues,
    };
  }

  /**
   * Validates task mock factory
   */
  static async validateTaskFactory(): Promise<ValidationResult> {
    try {
      // Import factory dynamically to avoid circular dependencies
      const TaskMockFactoryModule = await import(
        './mock-factories/TaskMockFactory.js'
      );
      const TaskMockFactory =
        TaskMockFactoryModule.TaskMockFactory || TaskMockFactoryModule.default;

      if (!TaskMockFactory) {
        return {
          valid: false,
          errors: ['TaskMockFactory not found in module'],
          warnings: [],
          fieldCoverage: 0,
          missingRequiredFields: [],
        };
      }

      // Test basic creation
      const basicTask = TaskMockFactory.create();
      const basicValidation =
        TestDataInspector.validateTaskStructure(basicTask);

      // Test with overrides
      const customTask = TaskMockFactory.create({
        content: 'Test content',
        status: 'pending',
        assignee_id: 'test-assignee',
      });
      const customValidation =
        TestDataInspector.validateTaskStructure(customTask);

      // Test multiple creation
      const multipleTasks = TaskMockFactory.createMultiple(3);
      const multipleValid = multipleTasks.every(
        (task) => TestDataInspector.validateTaskStructure(task).valid
      );

      const combinedErrors = [
        ...basicValidation.errors,
        ...customValidation.errors,
        ...(multipleValid ? [] : ['Multiple task creation validation failed']),
      ];

      return {
        valid: combinedErrors.length === 0,
        errors: combinedErrors,
        warnings: [...basicValidation.warnings, ...customValidation.warnings],
        fieldCoverage: Math.max(
          basicValidation.fieldCoverage,
          customValidation.fieldCoverage
        ),
        missingRequiredFields: basicValidation.missingRequiredFields,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`TaskMockFactory validation failed: ${error.message}`],
        warnings: [],
        fieldCoverage: 0,
        missingRequiredFields: [],
      };
    }
  }

  /**
   * Validates company mock factory
   */
  static async validateCompanyFactory(): Promise<ValidationResult> {
    try {
      const CompanyMockFactoryModule = await import(
        './mock-factories/CompanyMockFactory.js'
      );
      const CompanyMockFactory =
        CompanyMockFactoryModule.CompanyMockFactory ||
        CompanyMockFactoryModule.default;

      if (!CompanyMockFactory) {
        return {
          valid: false,
          errors: ['CompanyMockFactory not found in module'],
          warnings: [],
          fieldCoverage: 0,
          missingRequiredFields: [],
        };
      }

      const company = CompanyMockFactory.create();
      return TestDataInspector.validateCompanyStructure(company);
    } catch (error) {
      return {
        valid: false,
        errors: [`CompanyMockFactory validation failed: ${error.message}`],
        warnings: [],
        fieldCoverage: 0,
        missingRequiredFields: [],
      };
    }
  }

  /**
   * Validates person mock factory
   */
  static async validatePersonFactory(): Promise<ValidationResult> {
    try {
      const PersonMockFactoryModule = await import(
        './mock-factories/PersonMockFactory.js'
      );
      const PersonMockFactory =
        PersonMockFactoryModule.PersonMockFactory ||
        PersonMockFactoryModule.default;

      if (!PersonMockFactory) {
        return {
          valid: false,
          errors: ['PersonMockFactory not found in module'],
          warnings: [],
          fieldCoverage: 0,
          missingRequiredFields: [],
        };
      }

      const person = PersonMockFactory.create();
      return TestDataInspector.validatePersonStructure(person);
    } catch (error) {
      return {
        valid: false,
        errors: [`PersonMockFactory validation failed: ${error.message}`],
        warnings: [],
        fieldCoverage: 0,
        missingRequiredFields: [],
      };
    }
  }

  /**
   * Validates list mock factory
   */
  static async validateListFactory(): Promise<ValidationResult> {
    try {
      const ListMockFactoryModule = await import(
        './mock-factories/ListMockFactory.js'
      );
      const ListMockFactory =
        ListMockFactoryModule.ListMockFactory || ListMockFactoryModule.default;

      if (!ListMockFactory) {
        return {
          valid: false,
          errors: ['ListMockFactory not found in module'],
          warnings: [],
          fieldCoverage: 0,
          missingRequiredFields: [],
        };
      }

      const list = ListMockFactory.create();

      // Basic structure validation for lists
      const errors: string[] = [];
      const warnings: string[] = [];
      const missingRequiredFields: string[] = [];

      if (!list || typeof list !== 'object') {
        errors.push('List must be a valid object');
        return {
          valid: false,
          errors,
          warnings,
          fieldCoverage: 0,
          missingRequiredFields: ['id', 'title', 'name'],
        };
      }

      // Check list_id structure (AttioList uses list_id)
      if (!list.id || !list.id.list_id) {
        errors.push('List must have valid ID structure with list_id');
        missingRequiredFields.push('id.list_id');
      }

      if (!list.title && !list.name) {
        errors.push('List must have title or name');
        missingRequiredFields.push('title/name');
      }

      // Calculate field coverage for list
      const expectedFields = [
        'id',
        'title',
        'name',
        'description',
        'object_slug',
        'created_at',
      ];
      const fieldCoverage = this.calculateFieldCoverage(list, expectedFields);

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        fieldCoverage,
        missingRequiredFields,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`ListMockFactory validation failed: ${error.message}`],
        warnings: [],
        fieldCoverage: 0,
        missingRequiredFields: [],
      };
    }
  }
}

/**
 * Test Environment Diagnostics - Comprehensive system health check
 */
export class TestEnvironmentDiagnostics {
  /**
   * Runs full diagnostic suite
   */
  static runFullDiagnostic(): DiagnosticReport {
    return {
      environmentDetection: this.checkEnvironmentDetection(),
      mockFactoryStatus: MockDataValidator.validateAllFactories(),
      apiMockStatus: this.checkApiMockingStatus(),
      testDataCleanup: this.validateTestDataCleanup(),
      recommendations: this.generateRecommendations(),
    };
  }

  /**
   * Checks environment detection accuracy
   */
  private static checkEnvironmentDetection() {
    return {
      isTest: TestEnvironment.isTest(),
      testType: TestEnvironment.getContext(),
      useMocks: TestEnvironment.useMocks(),
      isCI: TestEnvironment.isCI(),
    };
  }

  /**
   * Checks API mocking status
   */
  private static checkApiMockingStatus() {
    return {
      configured: TestEnvironment.useMocks(),
      responding: true, // Could implement ping test
      errorRate: 0, // Could track from metrics
    };
  }

  /**
   * Validates test data cleanup tracking
   */
  private static validateTestDataCleanup() {
    // This would integrate with cleanup tracking system
    return {
      tracking: true,
      leakageDetected: false,
      orphanedRecords: 0,
    };
  }

  /**
   * Generates actionable recommendations
   */
  private static generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const report = MockDataValidator.validateAllFactories();

    if (report.overallScore < 0.9) {
      recommendations.push(
        'Mock factory validation score below 90% - review and fix validation errors'
      );
    }

    if (report.criticalIssues.length > 0) {
      recommendations.push(
        'Critical issues detected in mock factories - address immediately'
      );
    }

    if (!TestEnvironment.isTest()) {
      recommendations.push(
        'Environment detection may be incorrect - verify test environment setup'
      );
    }

    return recommendations;
  }
}

/**
 * E2E Test Failure Analyzer - Analyzes common failure patterns
 */
export class E2ETestFailureAnalyzer {
  /**
   * Error message patterns that commonly fail in E2E tests
   */
  private static readonly ERROR_PATTERNS = {
    notFound: /not found|invalid|does not exist/i,
    taskCreation: /task.*creat|creat.*task/i,
    highPriority: /high priority|priority.*high/i,
    recordLinking: /link.*record|record.*link/i,
    concurrentOperations: /concurrent|parallel/i,
  };

  /**
   * Analyzes error message and suggests fixes
   */
  static analyzeFailure(
    errorMessage: string,
    testContext: string
  ): {
    category: string;
    suggestions: string[];
    mockDataFix?: string;
    codeChanges?: string[];
  } {
    const suggestions: string[] = [];
    let category = 'unknown';
    let mockDataFix: string | undefined;
    const codeChanges: string[] = [];

    // Analyze error patterns
    if (this.ERROR_PATTERNS.notFound.test(errorMessage)) {
      category = 'error-message-format';
      suggestions.push('Error message format does not match expected pattern');
      suggestions.push(
        'Update mock error responses to include "not found", "invalid", or "does not exist"'
      );
      mockDataFix = 'Standardize error message formats across mock factories';
    }

    if (this.ERROR_PATTERNS.taskCreation.test(errorMessage)) {
      category = 'task-creation';
      suggestions.push('Task creation failure detected');
      suggestions.push('Check TaskMockFactory for Issue #480 compatibility');
      mockDataFix = 'Ensure task mock includes both content and title fields';
    }

    if (this.ERROR_PATTERNS.highPriority.test(errorMessage)) {
      category = 'high-priority-task';
      suggestions.push('High priority task handling needs improvement');
      codeChanges.push('Review TaskMockFactory.createHighPriority() method');
    }

    if (errorMessage.includes('Response has error flag')) {
      category = 'response-error-flag';
      suggestions.push('Mock response incorrectly flagged as error');
      suggestions.push('Check mock data generation for error conditions');
      mockDataFix = 'Ensure successful operations return success flag';
    }

    return {
      category,
      suggestions,
      mockDataFix,
      codeChanges,
    };
  }

  /**
   * Generates comprehensive failure report
   */
  static generateFailureReport(
    failures: Array<{
      testName: string;
      errorMessage: string;
      suite: string;
    }>
  ): {
    summary: {
      totalFailures: number;
      categorizedFailures: Record<string, number>;
      criticalIssues: string[];
    };
    detailedAnalysis: Array<{
      test: string;
      analysis: ReturnType<typeof E2ETestFailureAnalyzer.analyzeFailure>;
    }>;
    actionPlan: string[];
  } {
    const categorizedFailures: Record<string, number> = {};
    const criticalIssues: string[] = [];
    const detailedAnalysis = failures.map((failure) => {
      const analysis = this.analyzeFailure(failure.errorMessage, failure.suite);

      categorizedFailures[analysis.category] =
        (categorizedFailures[analysis.category] || 0) + 1;

      if (
        analysis.category === 'task-creation' ||
        analysis.category === 'error-message-format'
      ) {
        criticalIssues.push(`${failure.suite}: ${failure.testName}`);
      }

      return {
        test: `${failure.suite} > ${failure.testName}`,
        analysis,
      };
    });

    const actionPlan = this.generateActionPlan(
      categorizedFailures,
      criticalIssues
    );

    return {
      summary: {
        totalFailures: failures.length,
        categorizedFailures,
        criticalIssues,
      },
      detailedAnalysis,
      actionPlan,
    };
  }

  /**
   * Generates prioritized action plan
   */
  private static generateActionPlan(
    categorizedFailures: Record<string, number>,
    criticalIssues: string[]
  ): string[] {
    const plan: string[] = [];

    // Priority 1: Critical issues
    if (criticalIssues.length > 0) {
      plan.push(
        'PRIORITY 1: Address critical task creation and error message format issues'
      );
      criticalIssues.forEach((issue) => plan.push(`  - Fix: ${issue}`));
    }

    // Priority 2: Most common failure categories
    const sortedCategories = Object.entries(categorizedFailures)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    sortedCategories.forEach(([category, count]) => {
      if (count > 1) {
        plan.push(`PRIORITY 2: Fix ${category} issues (${count} failures)`);
      }
    });

    // Priority 3: Implement comprehensive validation
    plan.push('PRIORITY 3: Implement comprehensive mock data validation');
    plan.push('PRIORITY 4: Create regression prevention tests');

    return plan;
  }
}
