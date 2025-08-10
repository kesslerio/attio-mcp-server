# Troubleshooting Guide

This guide covers common issues and their solutions when working with the Attio MCP Server.

## Installation Issues

### API Key Problems

**Problem**: Authentication failed or invalid API key error
**Solution**: 
1. Verify your API key in [Attio API Explorer](https://developers.attio.com/reference/get_v2-objects)
2. Check environment variable: `echo $ATTIO_API_KEY`
3. Ensure no extra spaces or quotes in the key

### Permission Errors

**Problem**: Access denied or insufficient permissions
**Solution**:
1. Verify your API key has appropriate scopes in Attio
2. Check workspace access permissions
3. Contact your Attio workspace admin if needed

## Configuration Issues

### Claude Desktop Integration

**Problem**: Attio MCP Server not appearing in Claude
**Solution**:
1. Check configuration file location: `~/Library/Application Support/Claude/claude_desktop_config.json`
2. Validate JSON syntax in configuration file
3. Restart Claude Desktop application
4. Check Claude Desktop logs for errors

### Environment Variables

**Problem**: Environment variables not being recognized
**Solution**:
1. For global install: Set in system environment or shell profile
2. For development: Use `.env` file in project root
3. For Docker: Pass via `-e` flag or docker-compose environment section

## Runtime Issues

### Record Not Found

**Problem**: "Record not found" when searching for existing data
**Solution**:
1. Check spelling and exact record names
2. Verify record exists in Attio web interface
3. Use partial matching: "Find people with 'john' in name"
4. Check workspace context if multiple workspaces

### API Rate Limits

**Problem**: Too many requests or rate limit errors
**Solution**:
1. Reduce frequency of large batch operations
2. Use pagination for large result sets
3. Implement delays between bulk operations
4. Check Attio rate limits in their documentation

### Performance Issues

**Problem**: Slow response times or timeouts
**Solution**:
1. Use specific filters to reduce result sets
2. Avoid overly broad searches
3. Use indexed fields when possible
4. Check network connectivity

## Common Error Messages

### "Invalid filter operator"
- **Cause**: Using incorrect filter syntax
- **Solution**: Check [Filtering Guide](api/filtering-and-search.md) for correct operators

### "Field not found" 
- **Cause**: Referencing non-existent field names
- **Solution**: Verify field names in Attio interface or use attribute discovery

### "Connection refused"
- **Cause**: Server not running or incorrect port
- **Solution**: Check server status and port configuration

## Docker-Specific Issues

### Container Won't Start
1. Check logs: `docker logs attio-mcp-server`
2. Verify environment variables are set
3. Ensure no port conflicts
4. Check Docker daemon is running

### Health Check Failures
1. Verify container can reach external APIs
2. Check firewall settings
3. Validate API key permissions

## Getting Additional Help

### Enable Debug Logging
Set environment variable: `DEBUG=attio-mcp-server:*`

### Check Server Status
Use health check endpoint if available

### Community Support
- [GitHub Issues](https://github.com/kesslerio/attio-mcp-server/issues)
- Check existing issues for similar problems
- Provide detailed error messages and configuration when reporting

### Useful Information to Include
- Operating system and version
- Node.js version
- Installation method (npm/Docker/source)
- Complete error messages
- Configuration files (sanitized)
- Steps to reproduce the issue