import { GitHubService, RegistryComponent } from './github.js';

// Simplified interface for components
export interface Component {
  name: string;
  description: string;
  code: string;
  category: string;
  dependencies?: string[];
  files?: {
    path: string;
    type: string;
    target: string;
  }[];
  title?: string;
}

export class ComponentParser {
  private githubService: GitHubService;
  private components: Map<string, Component> = new Map();

  constructor(githubService: GitHubService) {
    this.githubService = githubService;
  }

  // Load all components
  async loadAllComponents(): Promise<void> {
    // Load components from registry
    await this.githubService.loadRegistryComponents();
    
    // Convert registry components to Component format
    const registryComponents = this.githubService.getAllRegistryComponents();
    
    for (const registryComponent of registryComponents) {
      const component: Component = {
        name: registryComponent.name,
        description: registryComponent.description,
        code: '', // We don't need to load the code here
        category: this.determineCategory(registryComponent),
        dependencies: registryComponent.dependencies,
        files: registryComponent.files,
        title: registryComponent.title
      };
      
      this.components.set(component.name, component);
    }
    
    console.error(`Loaded ${this.components.size} components`);
  }

  // Determine category based on registry component
  private determineCategory(registryComponent: RegistryComponent): string {
    const name = registryComponent.name.toLowerCase();
    
    // If the component has dependencies, use them to help determine the category
    if (registryComponent.dependencies) {
      if (registryComponent.dependencies.includes('motion')) return 'Animation';
    }
    
    // Determine category based on component name
    if (name.includes('button')) return 'Button';
    if (name.includes('card')) return 'Card';
    if (name.includes('text')) return 'Typography';
    if (name.includes('input')) return 'Form';
    if (name.includes('form')) return 'Form';
    if (name.includes('dialog')) return 'Dialog';
    if (name.includes('modal')) return 'Dialog';
    if (name.includes('menu')) return 'Navigation';
    if (name.includes('nav')) return 'Navigation';
    if (name.includes('table')) return 'Data Display';
    if (name.includes('list')) return 'Data Display';
    if (name.includes('grid')) return 'Layout';
    if (name.includes('layout')) return 'Layout';
    if (name.includes('animation')) return 'Animation';
    if (name.includes('effect')) return 'Effect';
    
    // Default category
    return 'Other';
  }

  // Get component by name
  getComponent(name: string): Component | undefined {
    return this.components.get(name);
  }

  // Get all components
  getAllComponents(): Component[] {
    return Array.from(this.components.values());
  }
} 