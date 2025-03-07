# MCP Magic UI

An MCP (Model Context Protocol) server for accessing and exploring Magic UI components from the [magicuidesign/magicui](https://github.com/magicuidesign/magicui) repository.

## What is MCP Magic UI?

MCP Magic UI is a server that implements the Model Context Protocol (MCP) to provide access to Magic UI components. It fetches component data from the Magic UI GitHub repository, categorizes them, and makes them available through an MCP API. This allows AI assistants and other MCP clients to easily discover and use Magic UI components in their applications.

## Features

- **Component Discovery**: Access all Magic UI components through MCP tools
- **Component Categorization**: Components are automatically categorized based on their names and dependencies
- **Caching System**: Local caching of component data to reduce GitHub API calls and work offline
- **Multiple Transport Options**: Support for both stdio and HTTP transport methods
- **Fallback Mechanism**: Mock data is provided when GitHub API is unavailable

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

## Using with npx

You can run the MCP Magic UI server directly using npx without installing it locally:

```bash
# Run with default settings
npx mcp-magic-ui

# Run with custom configuration
npx mcp-magic-ui --config "{\"githubToken\": \"your_token_here\", \"cachePath\": \"/custom/cache/path\"}"
```

### How npx Works

When you run `npx mcp-magic-ui` without having the package installed locally:

1. npx will search for the package in the npm registry (npmjs.com)
2. It will temporarily download the latest version of the package
3. The package will be executed directly from the npm cache
4. After execution, the temporary files are cleaned up automatically

The `-y` flag (e.g., `npx -y mcp-magic-ui`) automatically answers "yes" to any prompts, which is useful for running in scripts or with AI assistants.

> **Note:** For this to work, the package must be published to the npm registry. If you're developing locally, you'll need to publish your package first or use the local installation method.

### Publishing to npm

Before you can use the package with npx, you need to publish it to the npm registry:

```bash
# Login to npm (you'll need an npm account)
npm login

# Publish the package
npm publish
```

### Alternatives for Local Development

If you haven't published the package yet, you have several options:

1. **Use the local path with npx**:
   ```bash
   npx /path/to/mcp-magic-ui
   ```

2. **Install globally from local directory**:
   ```bash
   # From the project directory
   npm install -g .
   
   # Then you can run it from anywhere
   mcp-magic-ui
   ```

3. **Use with Claude Desktop without publishing**:
   ```json
   {
     "mcpServers": {
       "magic-ui": {
         "command": "/absolute/path/to/mcp-magic-ui/dist/cli.js"
       }
     }
   }
   ```

### Configuration Options

The `--config` parameter accepts a JSON string with the following options:

- **githubToken**: GitHub personal access token for API access (overrides GITHUB_TOKEN env var)
- **cachePath**: Custom path for storing cache files (default: ./cache)

### Using with Claude Desktop

To use with Claude Desktop, add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "magic-ui": {
      "command": "npx",
      "args": ["-y", "mcp-magic-ui"]
    }
  }
}
```

With custom configuration:

```json
{
  "mcpServers": {
    "magic-ui": {
      "command": "npx",
      "args": [
        "-y", 
        "mcp-magic-ui", 
        "--config", 
        "{\"githubToken\": \"your_token_here\", \"cachePath\": \"/custom/cache/path\"}"
      ]
    }
  }
}
```

## Configuration

To avoid GitHub API rate limits, it's recommended to set up a GitHub personal access token:

1. Create a token at https://github.com/settings/tokens
2. Create a `.env` file in the project root (or copy from `.env.example`)
3. Add your token to the `.env` file:

```
GITHUB_TOKEN=your_github_token_here
```

Alternatively, you can provide the token directly in the configuration as shown above.

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

The server provides the following MCP tools:

- `get_all_components` - Get a list of all available Magic UI components with their metadata
- `get_component_by_path` - Get the source code of a specific component by its file path

## Project Structure

- `src/` - Source code
  - `index.ts` - Main entry point for the server
  - `cli.ts` - Command-line interface
  - `server.ts` - MCP server configuration and tool definitions
  - `services/` - Service modules
    - `github.ts` - GitHub API interaction and caching
    - `component-parser.ts` - Component categorization and processing

- `cache/` - Local cache for component data
- `dist/` - Compiled JavaScript code

## How It Works

1. The server fetches component data from the Magic UI GitHub repository
2. Component data is cached locally to reduce API calls and enable offline usage
3. Components are categorized based on their names and dependencies
4. The server exposes MCP tools to access and search for components
5. Clients can connect to the server using stdio or HTTP transport

## Contributing

Contributions are welcome! Here are some ways you can contribute:

- Report bugs and suggest features by creating issues
- Improve documentation
- Submit pull requests with bug fixes or new features

## License

MIT 