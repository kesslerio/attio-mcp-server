/**
 * Smithery build configuration
 *
 * Externalizes the MCP SDK to prevent esbuild from bundling it,
 * which would mangle the Server class methods like .connect()
 */
export default {
  esbuild: {
    // Don't bundle the MCP SDK - use the runtime version
    external: [
      '@modelcontextprotocol/sdk',
      // Also externalize tiktoken to avoid WASM bundling issues
      '@dqbd/tiktoken',
    ],
    minify: true,
    target: 'node22',
  },
};
