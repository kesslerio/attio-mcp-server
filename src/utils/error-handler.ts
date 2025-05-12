/**
 * Error handler and result formatter
 */

/**
 * Creates a standardized error result for MCP responses
 * 
 * @param error - The error that occurred
 * @param path - The API path where the error occurred
 * @param method - The HTTP method that was used
 * @param data - Additional data about the error
 * @returns Formatted error response
 */
export function createErrorResult(
  error: Error, 
  path: string, 
  method: string, 
  data: any = {}
) {
  const responseStatus = (error as any).response?.status || 500;
  const responseData = (error as any).response?.data || data;
  
  let detailedMessage: string;
  if (responseData?.error?.message) {
    detailedMessage = `Error from Attio API: ${responseData.error.message}`;
  } else if (typeof responseData === 'string') {
    detailedMessage = `Error: ${responseData}`;
  } else {
    detailedMessage = error.message || 'Unknown error occurred';
  }
  
  return {
    content: [
      {
        type: "text",
        text: detailedMessage,
      },
    ],
    debug: {
      path,
      method,
      status: responseStatus,
      data: responseData
    },
    isError: true,
  };
}