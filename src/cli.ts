#!/usr/bin/env node

import { createServer } from './server.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

// Redirect console.log to console.error
const originalConsoleLog = console.log;
console.log = function(...args) {
  console.error(...args);
};

async function main() {
  // Create and start server with stdio transport
  const server = await createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(error => {
  console.error('Error starting MCP server:', error);
  process.exit(1);
}); 