#!/usr/bin/env node

import { createServer } from './server.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file
dotenv.config();

// Get the directory where the script is running
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Redirect console.log to console.error
const originalConsoleLog = console.log;
console.log = function(...args) {
  console.error(...args);
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--config' && i + 1 < args.length) {
      try {
        const configJson = JSON.parse(args[i + 1]);
        Object.assign(config, configJson);
        i++; // Skip the next argument as it's the config JSON
      } catch (error: any) {
        console.error('Error parsing config JSON:', error.message);
      }
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.error(`
Usage: mcp-magic-ui [options]

Options:
  --config JSON    Provide configuration as a JSON string with the following options:
                   - githubToken: GitHub personal access token (overrides GITHUB_TOKEN env var)
                   - cachePath: Custom path for storing cache files (default: ./cache)
  --help, -h       Show this help message
      `);
      process.exit(0);
    }
  }
  
  return config;
}

async function main() {
  // Parse command line arguments
  const config = parseArgs();
  
  // Create and start server with stdio transport
  const server = await createServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(error => {
  console.error('Error starting MCP server:', error);
  process.exit(1);
}); 