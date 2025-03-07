import { Octokit } from '@octokit/rest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to cache file
const CACHE_DIR = path.join(__dirname, '../../cache');
const REGISTRY_CACHE_FILE = path.join(CACHE_DIR, 'registry.json');
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

  constructor(token?: string) {
    // Use token from environment if not provided
    const authToken = token || process.env.GITHUB_TOKEN;
    this.octokit = new Octokit({ 
      auth: authToken,
      request: {
        retries: this.maxRetries,
        retryAfter: this.retryDelay
      }
    });
    
    if (!authToken) {
      console.warn('GitHub token not provided. API rate limits will be restricted.');
      console.warn('Create a token at https://github.com/settings/tokens and set it as GITHUB_TOKEN in .env file.');
    }
    
    // Create cache directory if it doesn't exist
    this.ensureCacheDirectory();
  }
  
  // Ensure cache directory exists
  private ensureCacheDirectory(): void {
    try {
      if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
        console.error(`Cache directory created at ${CACHE_DIR}`);
      }
    } catch (error) {
      console.error('Error creating cache directory:', error);
    }
  }
  
  // Check if cache is valid (not expired)
  private isCacheValid(): boolean {
    try {
      if (!fs.existsSync(REGISTRY_CACHE_FILE)) {
        return false;
      }
      
      const stats = fs.statSync(REGISTRY_CACHE_FILE);
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
      fs.writeFileSync(REGISTRY_CACHE_FILE, data);
      console.error(`Registry data cached to ${REGISTRY_CACHE_FILE}`);
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  }
  
  // Load data from cache
  private loadFromCache(): string | null {
    try {
      if (this.isCacheValid()) {
        console.error('Loading registry from cache');
        return fs.readFileSync(REGISTRY_CACHE_FILE, 'utf-8');
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
          path: 'registry.json',
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
      
      // Check file structure - registry.json has a structure with { name, homepage, items: [] }
      if (data && data.items && Array.isArray(data.items)) {
        // Store raw content of registry.json (the items)
        this.rawRegistryData = data.items;
        
        // Process each component in the registry
        for (const component of data.items) {
          if (component.name && component.type) {
            this.registryComponents.set(component.name, component as RegistryComponent);
          }
        }
        console.log(`Loaded ${this.registryComponents.size} components`);
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
        name: 'animated-beam',
        type: 'registry:ui',
        title: 'Animated Beam',
        description: 'An animated beam of light which travels along a path. Useful for showcasing the "integration" features of a website.',
        dependencies: ['motion'],
        files: [
          {
            path: 'registry/magicui/animated-beam.tsx',
            type: 'registry:ui',
            target: 'components/magicui/animated-beam.tsx'
          }
        ]
      },
      {
        name: 'border-beam',
        type: 'registry:ui',
        title: 'Border Beam',
        description: 'An animated beam of light which travels along the border of its container.',
        files: [
          {
            path: 'registry/magicui/border-beam.tsx',
            type: 'registry:ui',
            target: 'components/magicui/border-beam.tsx'
          }
        ]
      },
      {
        name: 'shimmer-button',
        type: 'registry:ui',
        title: 'Shimmer Button',
        description: 'A button with a shimmer effect that moves across the button.',
        files: [
          {
            path: 'registry/magicui/shimmer-button.tsx',
            type: 'registry:ui',
            target: 'components/magicui/shimmer-button.tsx'
          }
        ]
      }
    ];
    
    mockComponents.forEach(component => {
      this.registryComponents.set(component.name, component);
    });
    
    console.error(`Loaded ${this.registryComponents.size} mock components`);
  }
} 