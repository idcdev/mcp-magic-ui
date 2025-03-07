import { Octokit } from '@octokit/rest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default cache expiry time
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface RegistryComponent {
  name: string;
  type: string;
  title: string;
  description: string;
  dependencies?: string[];
  files: {
    path: string;
    type: string;
    target: string;
  }[];
  tailwind?: any;
}

export class GitHubService {
  private octokit: Octokit;
  private owner = 'magicuidesign';
  private repo = 'magicui';
  private componentsPath = 'components';
  private registryComponents: Map<string, RegistryComponent> = new Map();
  private retryDelay = 1000; // ms
  private maxRetries = 3;
  private rawRegistryData: any[] = []; // Store raw content of registry.json
  private cachePath: string;
  private registryPath: string;

  constructor(customCachePath?: string) {
    // Inicializar o cliente Octokit com o token do GitHub, se disponível
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
      request: {
        retries: this.maxRetries,
        retryAfter: this.retryDelay
      }
    });
    
    if (!process.env.GITHUB_TOKEN) {
      console.warn('GitHub token not provided. API rate limits will be restricted.');
      console.warn('Create a token at https://github.com/settings/tokens and set it as GITHUB_TOKEN in .env file.');
    }
    
    // Definir o caminho do cache
    this.cachePath = customCachePath || path.join(process.cwd(), 'cache');
    
    // Criar o diretório de cache se não existir
    this.ensureCacheDirectory();
    
    // Definir o caminho do arquivo de registro
    this.registryPath = path.join(this.cachePath, 'registry.json');
  }
  
  // Ensure cache directory exists
  private ensureCacheDirectory(): void {
    try {
      if (!fs.existsSync(this.cachePath)) {
        fs.mkdirSync(this.cachePath, { recursive: true });
        console.error(`Cache directory created at ${this.cachePath}`);
      }
    } catch (error) {
      console.error('Error creating cache directory:', error);
    }
  }
  
  // Check if cache is valid (not expired)
  private isCacheValid(): boolean {
    try {
      if (!fs.existsSync(this.registryPath)) {
        return false;
      }
      
      const stats = fs.statSync(this.registryPath);
      const cacheAge = Date.now() - stats.mtimeMs;
      
      return cacheAge < CACHE_EXPIRY_MS;
    } catch (error) {
      console.error('Error checking cache validity:', error);
      return false;
    }
  }
  
  // Save data to cache
  private saveToCache(data: string): void {
    try {
      fs.writeFileSync(this.registryPath, data);
      console.error(`Registry data cached to ${this.registryPath}`);
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  }
  
  // Load data from cache
  private loadFromCache(): string | null {
    try {
      if (this.isCacheValid()) {
        console.error('Loading registry from cache');
        return fs.readFileSync(this.registryPath, 'utf-8');
      }
      return null;
    } catch (error) {
      console.error('Error loading from cache:', error);
      return null;
    }
  }

  async getComponentsList(): Promise<string[]> {
    try {
      // Fetch list of components from GitHub
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: this.componentsPath,
      });

      // Filter directories (each directory is a component)
      return Array.isArray(data)
        ? data
            .filter((item: any) => item.type === 'dir')
            .map((item: any) => item.name)
        : [];
    } catch (error) {
      console.error('Error fetching components list:', error);
      return [];
    }
  }

  async getComponentFiles(componentName: string): Promise<any[]> {
    try {
      // Fetch all files for a specific component
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: `${this.componentsPath}/${componentName}`,
      });

      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error(`Error fetching files for component ${componentName}:`, error);
      return [];
    }
  }

  async getFileContent(path: string): Promise<string> {
    try {
      // Fetch content of a specific file
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
      });

      if ('content' in data) {
        // Decode content from base64
        return Buffer.from(data.content, 'base64').toString('utf-8');
      }
      
      throw new Error(`Could not get content for path: ${path}`);
    } catch (error: any) {
      // Check if it's a rate limit error
      if (error.status === 403 && error.message.includes('API rate limit exceeded')) {
        console.error('GitHub API rate limit exceeded. Consider using a token.');
        // Return empty string instead of throwing
        return '';
      }
      
      console.error(`Error fetching file content for ${path}:`, error);
      return '';
    }
  }

  // Try to load from cache first
  async loadRegistryComponents(): Promise<void> {
    // Try to load from cache first
    let content = this.loadFromCache();
    
    // If no valid cache, fetch from GitHub
    if (!content) {
      try {
        const response = await this.octokit.repos.getContent({
          owner: this.owner,
          repo: this.repo,
          path: 'cache/registry.json',
        });
        
        // Save to cache if successfully retrieved
        if (response.data && 'content' in response.data) {
          content = Buffer.from(response.data.content, 'base64').toString('utf-8');
          this.saveToCache(content);
        }
      } catch (error) {
        console.error('Error fetching registry from GitHub:', error);
      }
    }
    
    // If still no content, use mock data
    if (!content) {
      console.warn('Using mock data as fallback');
      this.loadMockRegistryData();
      return;
    }
    
    try {
      const data = JSON.parse(content);
      
      // Check file structure
      if (Array.isArray(data)) {
        // Store raw content of registry.json (the items)
        this.rawRegistryData = data;
        
        // Process each component in the registry
        for (const component of data) {
          if (component.name && component.type) {
            this.registryComponents.set(component.name, component as RegistryComponent);
          }
        }
      } else {
        // Old or unexpected structure
        console.error('Unexpected registry.json structure');
      }
    } catch (error) {
      console.error('Error parsing registry data:', error);
    }
  }
  
  // Get raw registry.json content
  getRawRegistryData(): any[] {
    return this.rawRegistryData;
  }

  getRegistryComponent(name: string): RegistryComponent | undefined {
    return this.registryComponents.get(name);
  }

  getAllRegistryComponents(): RegistryComponent[] {
    return Array.from(this.registryComponents.values());
  }

  // Load some mock data for testing when GitHub API fails
  private loadMockRegistryData() {
    const mockComponents: RegistryComponent[] = [
      {
        name: 'accordion',
        type: 'component',
        title: 'Accordion',
        description: 'A vertically stacked set of interactive headings that each reveal a section of content.',
        files: [
          {
            path: 'components/accordion/accordion.tsx',
            type: 'component',
            target: 'accordion.tsx'
          }
        ]
      },
      {
        name: 'alert',
        type: 'component',
        title: 'Alert',
        description: 'Displays a callout for user attention.',
        files: [
          {
            path: 'components/alert/alert.tsx',
            type: 'component',
            target: 'alert.tsx'
          }
        ]
      }
    ];
    
    // Add mock components to registry
    for (const component of mockComponents) {
      this.registryComponents.set(component.name, component);
    }
    
    // Set raw data
    this.rawRegistryData = mockComponents;
    
    console.error(`Loaded ${this.registryComponents.size} mock components`);
  }
} 