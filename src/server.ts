import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GitHubService } from "./services/github.js";
import { ComponentParser } from "./services/component-parser.js";

// Interface para configuração
interface ServerConfig {
  githubToken?: string;
  cachePath?: string;
  [key: string]: any;
}

export async function createServer(config: ServerConfig = {}) {
  // Apply configuration
  if (config.githubToken) {
    process.env.GITHUB_TOKEN = config.githubToken;
  }
  
  // Initialize services
  const githubService = new GitHubService(config.cachePath);
  const componentParser = new ComponentParser(githubService);
  
  // Load all components
  console.error("Loading components...");
  await componentParser.loadAllComponents();
  console.error("Components loaded successfully!");
  
  // Create MCP server
  const server = new McpServer({
    name: "Magic UI Components",
    version: "1.0.0",
    description: "MCP server for accessing Magic UI components",
  });
  
  // Register all components tool
  server.tool(
    "get_all_components",
    {},
    async () => {
      // Get the raw content of registry.json
      const rawData = githubService.getRawRegistryData();
      
      // If no data, return processed components as fallback
      if (!rawData || rawData.length === 0) {
        const components = componentParser.getAllComponents();
        return {
          content: [{
            type: "text",
            text: JSON.stringify(components, null, 2),
          }],
        };
      }
      
      // Return the raw content of registry.json
      return {
        content: [{
          type: "text",
          text: JSON.stringify(rawData, null, 2),
        }],
      };
    }
  );
  
  // Adicionar ferramenta para obter um componente específico pelo caminho
  server.tool(
    "get_component_by_path",
    {
      path: z.string().describe("Path to the component file"),
    },
    async (params: any) => {
      const path = params.path as string;
      
      try {
        // Obter o conteúdo do arquivo
        const content = await githubService.getFileContent(path);
        
        if (!content) {
          return {
            content: [{
              type: "text",
              text: `Component file at path '${path}' not found or empty`,
            }],
            isError: true,
          };
        }
        
        return {
          content: [{
            type: "text",
            text: content,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error fetching component at path '${path}': ${error}`,
          }],
          isError: true,
        };
      }
    }
  );
  
  return server;
} 