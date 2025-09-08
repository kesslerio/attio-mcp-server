/**
 * Test execution utilities for Customer Success Playbook tests
 */
import { MCPTestClient } from 'mcp-test-client';

import { PlaybookTestResult, ValidationLevel, ValidationResult, ToolResult } from './types.js';
import { TestValidator } from './test-validator.js';

export async function executePlaybookTest(
  client: MCPTestClient,
  prompt: string,
  expectedOutcome: string,
  toolName: string,
  toolParams: Record<string, unknown>
): Promise<PlaybookTestResult> {

  try {
    console.log(
      `\n🧪 Testing customer success prompt: "${prompt.substring(0, 80)}..."`
    );
    console.log(`🎯 Expected outcome: ${expectedOutcome}`);
    console.log(`🔧 Using tool: ${toolName}`);

    let result: ToolResult | null = null;
    let validationResult: ValidationResult | null = null;
    let validationLevel: ValidationLevel = ValidationLevel.FRAMEWORK_ERROR;

    await client.assertToolCall(
      toolName,
      toolParams,
      (toolResult: ToolResult) => {
        result = toolResult;

        console.log(`⏱️ Execution time: ${duration.toFixed(2)}ms`);

        // Use TestValidator for comprehensive validation
        validationResult = TestValidator.validateToolResult(toolName, toolResult);
        validationLevel = TestValidator.determineValidationLevel(validationResult);

        // Enhanced logging based on validation results
        switch (validationLevel) {
          case ValidationLevel.FRAMEWORK_ERROR:
            console.error('❌ Framework execution failed');
            if (validationResult.errorDetails.length > 0) {
              console.error('   Errors:', validationResult.errorDetails.join(', '));
            }
            break;
            
          case ValidationLevel.API_ERROR:
            console.error('❌ API call failed');
            if (validationResult.errorDetails.length > 0) {
              console.error('   Errors:', validationResult.errorDetails.join(', '));
            }
            break;
            
          case ValidationLevel.DATA_ERROR:
            console.error('❌ Data validation failed');
            if (validationResult.errorDetails.length > 0) {
              console.error('   Errors:', validationResult.errorDetails.join(', '));
            }
            break;
            
          case ValidationLevel.PARTIAL_SUCCESS:
            console.warn('⚠️ Partial success (with warnings)');
            if (validationResult.warningDetails.length > 0) {
              console.warn('   Warnings:', validationResult.warningDetails.join(', '));
            }
            if (toolResult.content && toolResult.content.length > 0) {
              if ('text' in content) {
                console.log(`📄 Result preview: ${content.text.substring(0, 200)}...`);
              }
            }
            break;
            
          case ValidationLevel.FULL_SUCCESS:
            console.log('✅ Full validation success');
            if (toolResult.content && toolResult.content.length > 0) {
              if ('text' in content) {
                console.log(`📄 Result preview: ${content.text.substring(0, 200)}...`);
              }
            }
            break;
            
          default:
            console.error('❌ Unknown validation level');
            break;
        }
        return true;
      }
    );


    // Determine overall test success based on validation level
                       validationLevel === ValidationLevel.PARTIAL_SUCCESS;

    return {
      success: testSuccess,
      prompt,
      expectedOutcome,
      actualResult: result || undefined,
      duration,
      validationLevel,
      validationDetails: validationResult || undefined,
    };
  } catch (error) {

    console.error('❌ Test execution failed:', error);

    return {
      success: false,
      prompt,
      expectedOutcome,
      error: error instanceof Error ? error.message : String(error),
      duration,
      validationLevel: ValidationLevel.FRAMEWORK_ERROR,
    };
  }
}