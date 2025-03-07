import { createServer } from './server.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import express from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  try {
    const server = await createServer();
    
    // Determine transport method from environment variable or argument
    const transportType = process.env.TRANSPORT_TYPE || 'stdio';
    
    if (transportType === 'stdio') {
      // Use stdio transport
      const transport = new StdioServerTransport();
      await server.connect(transport);
      console.log('MCP server started with stdio transport');
    } else if (transportType === 'http') {
      // Use HTTP with SSE transport
      const app = express();
      const port = process.env.PORT || 3000;
      let transport: SSEServerTransport;
      
      app.get('/sse', async (req: Request, res: Response) => {
        transport = new SSEServerTransport('/messages', res);
        await server.connect(transport);
      });
      
      app.post('/messages', async (req: Request, res: Response) => {
        if (transport) {
          await transport.handlePostMessage(req, res);
        } else {
          res.status(400).send('No active transport connection');
        }
      });
      
      app.listen(port, () => {
        console.log(`MCP server started with HTTP transport on port ${port}`);
      });
    } else {
      console.error(`Unknown transport type: ${transportType}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error starting MCP server:', error);
    process.exit(1);
  }
}

main(); 