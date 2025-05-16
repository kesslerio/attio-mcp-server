#!/usr/bin/env node
// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { initializeAttioClient } from "./api/attio-client.js";
import { registerResourceHandlers } from "./handlers/resources.js";
import { registerToolHandlers } from "./handlers/tools.js";
import { registerPromptHandlers } from "./prompts/handlers.js";
import { startAutoDiscovery, stopAutoDiscovery } from "./utils/auto-discovery.js";
// Create server instance
const server = new Server({
    name: "attio-mcp-server",
    version: "0.0.2",
}, {
    capabilities: {
        resources: {},
        tools: {},
        // Declare both prompts/list and prompts/get capabilities
        prompts: {
            list: {},
            get: {}
        },
    },
});
// Main function
async function main() {
    try {
        if (!process.env.ATTIO_API_KEY) {
            throw new Error("ATTIO_API_KEY environment variable not found");
        }
        // Initialize API client
        initializeAttioClient(process.env.ATTIO_API_KEY);
        // Register handlers
        registerResourceHandlers(server);
        registerToolHandlers(server);
        registerPromptHandlers(server);
        // Start automatic attribute discovery
        const autoDiscoveryConfig = {
            enabled: process.env.ATTIO_AUTO_DISCOVERY !== 'false', // Default to true
            runOnStartup: process.env.ATTIO_DISCOVERY_ON_STARTUP !== 'false', // Default to true
            intervalMinutes: process.env.ATTIO_DISCOVERY_INTERVAL ?
                parseInt(process.env.ATTIO_DISCOVERY_INTERVAL, 10) : 60, // Default to 60 minutes
        };
        // Silent mode - no console outputs for MCP compatibility
        if (autoDiscoveryConfig.enabled) {
            await startAutoDiscovery(process.env.ATTIO_API_KEY, autoDiscoveryConfig);
        }
        // Health check server removed for MCP compatibility
        // Handle graceful shutdown
        const shutdown = () => {
            // Silent shutdown for MCP compatibility
            stopAutoDiscovery();
            process.exit(0);
        };
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
        // Connect to transport
        const transport = new StdioServerTransport();
        await server.connect(transport);
    }
    catch (error) {
        console.error("Error starting server:", error);
        process.exit(1);
    }
}
main().catch(error => {
    console.error("Unhandled error:", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map