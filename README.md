# MCP Magic UI

An MCP (Model Context Protocol) server for accessing and searching Magic UI components.

## Features

- Access Magic UI components through MCP resources
- Search for components by name, description, or category
- Get component code and usage examples
- Compatible with any MCP client

## Installation

```bash
# Clone the repository
git clone https://github.com/idcdev/mcp-magic-ui.git
cd mcp-magic-ui

# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

### Starting the server

You can start the server using either stdio or HTTP transport:

```bash
# Using stdio transport (default)
npm start

# Using HTTP transport
TRANSPORT_TYPE=http npm start
```

### Connecting to the server

You can connect to the server using any MCP client. For example, using the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector mcp-magic-ui
```

Or, if using HTTP transport:

```bash
npx @modelcontextprotocol/inspector http://localhost:3000
```

## Available Tools

### Tools

- `search_components` - Search for components by query and optional category
- `get_component_code` - Get the source code of a specific component

## License

MIT 