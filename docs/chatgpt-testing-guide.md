# ChatGPT Connector Testing Guide

## Prerequisites

1. Ensure the Attio MCP server is running with SSE transport enabled:
   ```bash
   ENABLE_SSE_TRANSPORT=true attio-mcp
   ```

2. Verify the server is accessible at `http://localhost:3000`

## Manual Testing

### 1. Verify Tool Definitions

Check that OpenAI tools are properly exposed:

```bash
curl -s http://localhost:3000/openai/tools | jq '.'
```

Expected response:
```json
{
  "tools": [
    {
      "name": "search",
      "description": "Search for records in Attio CRM across companies, people, lists, and tasks",
      "parameters": {...}
    },
    {
      "name": "fetch",
      "description": "Fetch detailed information about a specific record by its ID",
      "parameters": {...}
    }
  ]
}
```

### 2. Test Search Functionality

#### Basic Search
```bash
curl -s -X POST http://localhost:3000/openai/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "search",
    "arguments": {
      "query": "test"
    }
  }' | jq '.'
```

#### Company Search
```bash
curl -s -X POST http://localhost:3000/openai/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "search",
    "arguments": {
      "query": "technology companies"
    }
  }' | jq '.'
```

#### People Search
```bash
curl -s -X POST http://localhost:3000/openai/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "search",
    "arguments": {
      "query": "CEO engineer"
    }
  }' | jq '.'
```

### 3. Test Fetch Functionality

After getting record IDs from search results:

```bash
# Replace with actual ID from search results
curl -s -X POST http://localhost:3000/openai/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "fetch",
    "arguments": {
      "id": "companies:abc123-def456"
    }
  }' | jq '.'
```

### 4. Test Error Handling

#### Invalid Tool Name
```bash
curl -s -X POST http://localhost:3000/openai/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "invalid_tool",
    "arguments": {}
  }' | jq '.'
```

#### Missing Required Arguments
```bash
curl -s -X POST http://localhost:3000/openai/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "search",
    "arguments": {}
  }' | jq '.'
```

#### Invalid Record ID
```bash
curl -s -X POST http://localhost:3000/openai/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "fetch",
    "arguments": {
      "id": "invalid-format"
    }
  }' | jq '.'
```

## Automated Testing

### Run Unit Tests
```bash
npm test test/openai
```

### Run Integration Tests (requires API key)
```bash
npm run test:integration
```

## Python Client Testing

Create a test script `test_chatgpt_connector.py`:

```python
import requests
import json

BASE_URL = "http://localhost:3000"

def test_tools_endpoint():
    """Test that tools are properly exposed"""
    response = requests.get(f"{BASE_URL}/openai/tools")
    assert response.status_code == 200
    data = response.json()
    assert "tools" in data
    assert len(data["tools"]) == 2
    print("✓ Tools endpoint working")

def test_search():
    """Test search functionality"""
    response = requests.post(
        f"{BASE_URL}/openai/execute",
        json={
            "tool": "search",
            "arguments": {"query": "test"}
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "result" in data
    print(f"✓ Search returned {len(data['result'])} results")

def test_fetch():
    """Test fetch functionality"""
    # First get a valid ID from search
    search_response = requests.post(
        f"{BASE_URL}/openai/execute",
        json={
            "tool": "search",
            "arguments": {"query": "test"}
        }
    )
    search_data = search_response.json()
    
    if search_data.get("result") and len(search_data["result"]) > 0:
        record_id = search_data["result"][0]["id"]
        
        # Now fetch that record
        fetch_response = requests.post(
            f"{BASE_URL}/openai/execute",
            json={
                "tool": "fetch",
                "arguments": {"id": record_id}
            }
        )
        assert fetch_response.status_code == 200
        fetch_data = fetch_response.json()
        assert "metadata" in fetch_data
        print(f"✓ Fetch retrieved record: {record_id}")
    else:
        print("⚠ No records available to test fetch")

if __name__ == "__main__":
    test_tools_endpoint()
    test_search()
    test_fetch()
    print("\n✅ All tests passed!")
```

Run the Python tests:
```bash
python test_chatgpt_connector.py
```

## ChatGPT Custom GPT Testing

### 1. Create Custom GPT

1. Go to ChatGPT > Explore GPTs > Create
2. Name: "Attio CRM Assistant"
3. Instructions: "You help users interact with their Attio CRM data"
4. Add Action with OpenAPI schema from `docs/chatgpt-connector.md`

### 2. Test Conversations

Try these prompts in your Custom GPT:

- "Search for all technology companies"
- "Find people who are CEOs"
- "Show me recent tasks"
- "Get details about company [ID]"
- "Find companies created this month"

### 3. Verify Response Format

Ensure responses include:
- Relevant record IDs
- Human-readable titles
- Descriptive text snippets
- Direct links to Attio records

## Performance Testing

### Load Test with Apache Bench
```bash
# Test 100 requests with 10 concurrent connections
ab -n 100 -c 10 -p search.json -T application/json \
   http://localhost:3000/openai/execute
```

Create `search.json`:
```json
{
  "tool": "search",
  "arguments": {
    "query": "test"
  }
}
```

### Monitor with curl timing
```bash
curl -w "@curl-format.txt" -o /dev/null -s \
  -X POST http://localhost:3000/openai/execute \
  -H "Content-Type: application/json" \
  -d '{"tool":"search","arguments":{"query":"test"}}'
```

Create `curl-format.txt`:
```
time_namelookup:  %{time_namelookup}s\n
time_connect:  %{time_connect}s\n
time_appconnect:  %{time_appconnect}s\n
time_pretransfer:  %{time_pretransfer}s\n
time_redirect:  %{time_redirect}s\n
time_starttransfer:  %{time_starttransfer}s\n
----------\n
time_total:  %{time_total}s\n
```

## Troubleshooting

### Common Issues

1. **"Cannot POST /openai/execute"**
   - Ensure SSE transport is enabled: `ENABLE_SSE_TRANSPORT=true`
   - Check server is running on correct port

2. **Empty search results**
   - Verify ATTIO_API_KEY is set correctly
   - Check workspace has data
   - Try broader search terms

3. **CORS errors in browser**
   - Ensure `SSE_ENABLE_CORS=true` (default)
   - Check browser console for specific origin errors

4. **Rate limiting**
   - Default limit: 100 requests/minute
   - Adjust with `SSE_RATE_LIMIT_PER_MINUTE` env var

### Debug Mode

Enable detailed logging:
```bash
NODE_ENV=development ENABLE_SSE_TRANSPORT=true attio-mcp
```

Check logs for:
- Incoming request details
- API calls to Attio
- Response transformations
- Error stack traces

## Success Criteria

✅ All endpoints return 200 status codes  
✅ Search returns relevant results  
✅ Fetch retrieves complete record details  
✅ Error responses include helpful messages  
✅ Response times < 1 second for typical queries  
✅ Can handle 100+ concurrent connections  
✅ Works with ChatGPT Custom GPT  
✅ Python/JavaScript clients can integrate successfully  

## Next Steps

After successful testing:
1. Document any issues found
2. Update PR with test results
3. Request code review
4. Plan production deployment