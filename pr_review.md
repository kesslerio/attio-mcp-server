# Code Review: PR #37 - Implement MCP Prompts Functionality

## Overview
This PR implements MCP Prompts functionality according to the Model Context Protocol specification (issue #33). The implementation includes:
- Addition of prompts/list and prompts/get endpoints with proper MCP server capability declarations
- Improved health server with better error handling and logging
- Fixed ES module imports for Handlebars with template caching
- Comprehensive documentation of the prompts API
- A test script to verify endpoint functionality

## Strengths
- **Well-Structured Documentation**: The new prompts-api.md file provides comprehensive guidance on using and extending the prompts functionality.
- **Performance Optimization**: Implementation of template caching for Handlebars templates is a good performance enhancement.
- **Robust Health Server**: Improved with port fallback, proper content types, and redirected logging to prevent JSON-RPC interference.
- **Testing**: The test script provides good coverage of basic functionality.
- **Module Compatibility**: The ES module import fixes address important compatibility issues.

## Areas for Improvement

### 1. Documentation
- **API Examples**: Could benefit from concrete JSON request/response examples
- **Visual Representation**: A diagram showing the prompt template processing flow would enhance understanding

### 2. Error Handling
- **Health Server**: Lacks maximum retry timeout configuration
- **Template Rendering**: Could provide more specific error messages for template failures
- **Parameter Validation**: Add more validation for prompt parameters before rendering

### 3. Testing Robustness
- **Server Readiness**: Uses setTimeout for server startup which could be flaky
- **Response Validation**: Lacks schema validation for responses
- **Assertions**: Mostly logs output without specific assertions

### 4. Code Structure and Maintainability
- **Dynamic Import Utility**: Purpose and usage not clearly documented
- **Template Cache**: No size limits or expiration mechanism
- **Logging**: Uses console.error directly instead of a structured logging system

## Specific Recommendations

### Documentation Enhancements
```markdown
// Add to docs/prompts-api.md:

## API Examples

### prompts/list Request
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "prompts/list",
  "params": {}
}
```

### prompts/list Response
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "result": {
    "prompts": [
      {
        "id": "create-person",
        "name": "Create a new person",
        "description": "Create a new person record in Attio with the provided details",
        "category": "people"
      },
      // More prompts...
    ]
  }
}
```
```

### Health Server Improvements
```typescript
// In src/health/http-server.ts:

export function startHealthServer(
  port: number = 3000, 
  maxRetries: number = 3,
  maxRetryTime: number = 10000 // Add maximum retry time in ms
): http.Server {
  // ...existing code...
  
  // Add timeout for retries
  let retryTimeout: NodeJS.Timeout | null = null;
  
  // Try to start the server with port fallback
  const tryListen = (currentPort: number, retriesLeft: number, startTime: number = Date.now()) => {
    // Check if max retry time exceeded
    if (Date.now() - startTime > maxRetryTime && retriesLeft < maxRetries) {
      console.error(`Maximum retry time exceeded (${maxRetryTime}ms), stopping retries`);
      return;
    }
    
    // ...existing code...
    
    // Handle port in use errors
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE' && retriesLeft > 0) {
        console.error(`Port ${currentPort} is already in use, trying port ${currentPort + 1}`);
        server.close();
        
        // Clear previous timeout if it exists
        if (retryTimeout) clearTimeout(retryTimeout);
        
        // Try the next port with an exponential backoff
        retryTimeout = setTimeout(() => {
          tryListen(currentPort + 1, retriesLeft - 1, startTime);
        }, Math.min(500 * (maxRetries - retriesLeft + 1), 2000));
      } else {
        console.error(`Health check server error: ${err}`);
      }
    });
  };
  
  // Start trying ports
  tryListen(port, maxRetries);
  
  // Add graceful shutdown
  const shutdownServer = () => {
    if (retryTimeout) clearTimeout(retryTimeout);
    server.close();
  };
  
  // Expose shutdown method
  (server as any).shutdown = shutdownServer;
  
  return server;
}
```

### Template Cache Improvements
```typescript
// In src/prompts/handlers.ts:

// Improve template cache with size limit and types
interface TemplateCacheOptions {
  maxSize: number;
}

class TemplateCache {
  private cache = new Map<string, HandlebarsTemplateDelegate>();
  private options: TemplateCacheOptions;
  
  constructor(options: Partial<TemplateCacheOptions> = {}) {
    this.options = {
      maxSize: 100,
      ...options
    };
  }
  
  get(key: string): HandlebarsTemplateDelegate | undefined {
    return this.cache.get(key);
  }
  
  set(key: string, template: HandlebarsTemplateDelegate): void {
    // Check if we need to evict entries
    if (this.cache.size >= this.options.maxSize && \!this.cache.has(key)) {
      // Simple LRU: delete the first entry (could be enhanced)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, template);
  }
  
  has(key: string): boolean {
    return this.cache.has(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
}

// Create the template cache instance
const templateCache = new TemplateCache();
```

### Test Script Improvements
```javascript
// In test/prompts-test.js:

// Replace setTimeout with a more reliable mechanism
function waitForServerReady(serverProcess) {
  return new Promise((resolve, reject) => {
    // Set timeout for overall startup
    const timeout = setTimeout(() => {
      reject(new Error('Server startup timed out after 10 seconds'));
    }, 10000);
    
    // Listen for "ready" indicator in stderr
    serverProcess.stderr.on('data', (data) => {
      if (data.toString().includes('Health check server listening on port')) {
        clearTimeout(timeout);
        // Give it a small additional delay to ensure full readiness
        setTimeout(resolve, 500);
      }
    });
  });
}

// Use with async/await
async function runTests() {
  // Start server
  const serverProcess = spawn(/* existing code */);
  
  try {
    await waitForServerReady(serverProcess);
    console.log('Server is ready, beginning tests...');
    
    // Run tests...
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Ensure server is always shut down
    serverProcess.kill();
  }
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
```

## Final Recommendation
This PR makes significant improvements to the MCP server by implementing the Prompts API and fixing several underlying issues. The code is generally well-structured and includes good documentation. I recommend merging this PR after addressing the following key points:

1. Add more specific JSON request/response examples to the documentation
2. Enhance the health server with better retry handling and timeout configuration
3. Improve the template cache with size limits and better typing
4. Make the test script more robust with better server readiness detection

Overall, this PR is a valuable addition that brings important functionality to the MCP server in alignment with issue #33.
