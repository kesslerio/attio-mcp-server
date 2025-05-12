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
import { startHealthServer } from "./health/http-server.js";

// Create server instance
const server = new Server(
  {
    name: "attio-mcp-server",
    version: "0.0.2",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      // Declare both prompts/list and prompts/get capabilities
      prompts: {
        list: {},
        get: {}
      },
    },
  },
);

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
    
    // Start health check server (for Docker)
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    const healthServer = startHealthServer(port);
    
    // Handle graceful shutdown
    const shutdown = () => {
      console.log("Shutting down servers...");
      healthServer.close();
      process.exit(0);
    };
    
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Connect to transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error("Unhandled error:", error);
  process.exit(1);
});