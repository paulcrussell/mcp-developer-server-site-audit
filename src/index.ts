#!/usr/bin/env node

/**
 * MCP Server for Site Auditing
 * Analyzes website structure to identify page templates and entities
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';

import { SiteCrawler } from './crawler.js';
import { ScenarioGenerator } from './scenario-generator.js';
import { SiteStructure } from './types.js';

/**
 * MCP Server for site auditing
 */
class SiteAuditServer {
  private server: Server;
  private scenarioGenerator: ScenarioGenerator;

  constructor() {
    this.server = new Server(
      {
        name: 'site-audit-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.scenarioGenerator = new ScenarioGenerator();
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'analyze_site',
          description: 'Analyze a website to identify page templates (PDP, PLP, Category, etc.) and entities (categories, not individual products). Perfect for ecommerce solution architects.',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'The website URL to analyze (e.g., https://example.com)',
              },
              maxPages: {
                type: 'number',
                description: 'Maximum number of pages to crawl (default: 50)',
                default: 50,
              },
            },
            required: ['url'],
          },
        },
        {
          name: 'get_site_categories',
          description: 'Get all discovered categories from a previously analyzed site',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'The website URL that was analyzed',
              },
            },
            required: ['url'],
          },
        },
        {
          name: 'get_page_templates',
          description: 'Get all identified page templates (PDP, PLP, Category, etc.) from a site analysis',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'The website URL that was analyzed',
              },
            },
            required: ['url'],
          },
        },
        {
          name: 'generate_crawl_scenarios',
          description: 'Generate Selenium crawling scenarios based on site analysis',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'The website URL that was analyzed',
              },
              format: {
                type: 'string',
                enum: ['json', 'python', 'javascript'],
                description: 'Output format for scenarios (default: json)',
                default: 'json',
              },
            },
            required: ['url'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        switch (name) {
          case 'analyze_site':
            return await this.handleAnalyzeSite(args);

          case 'get_site_categories':
            return await this.handleGetCategories(args);

          case 'get_page_templates':
            return await this.handleGetTemplates(args);

          case 'generate_crawl_scenarios':
            return await this.handleGenerateScenarios(args);

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Error executing tool: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  /**
   * Handle analyze_site tool
   */
  private async handleAnalyzeSite(args: any) {
    const url = args.url as string;
    const maxPages = (args.maxPages as number) || 50;

    if (!url) {
      throw new McpError(ErrorCode.InvalidParams, 'url is required');
    }

    const crawler = new SiteCrawler(url, maxPages);
    const siteStructure = await crawler.analyzeSite();

    // Store in memory (in a real implementation, use persistent storage)
    this.cacheSiteStructure(url, siteStructure);

    // Format the response
    const templates = Array.from(siteStructure.templates.entries()).map(([type, template]) => ({
      type,
      urlPattern: template.urlPattern,
      exampleUrls: template.exampleUrls,
      characteristics: template.characteristics,
      detectedElements: template.detectedElements,
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            domain: siteStructure.domain,
            analyzedAt: siteStructure.analyzedAt,
            summary: {
              templatesFound: templates.length,
              categoriesFound: siteStructure.entities.filter(e => e.type === 'category').length,
              subcategoriesFound: siteStructure.entities.filter(e => e.type === 'subcategory').length,
              pagesAnalyzed: siteStructure.siteMap?.length || 0,
            },
            templates,
            categories: siteStructure.entities.map(e => ({
              type: e.type,
              name: e.name,
              url: e.url,
              parentCategory: e.parentCategory,
            })),
            robotsTxt: siteStructure.robotsTxt ? 'Available' : 'Not found',
          }, null, 2),
        },
      ],
    };
  }

  /**
   * Handle get_site_categories tool
   */
  private async handleGetCategories(args: any) {
    const url = args.url as string;

    if (!url) {
      throw new McpError(ErrorCode.InvalidParams, 'url is required');
    }

    const siteStructure = this.getCachedSiteStructure(url);
    if (!siteStructure) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'Site not analyzed yet. Run analyze_site first.'
      );
    }

    const categories = siteStructure.entities.filter(e => 
      e.type === 'category' || e.type === 'subcategory'
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            domain: siteStructure.domain,
            totalCategories: categories.length,
            categories: categories.map(c => ({
              type: c.type,
              name: c.name,
              url: c.url,
              parentCategory: c.parentCategory,
            })),
          }, null, 2),
        },
      ],
    };
  }

  /**
   * Handle get_page_templates tool
   */
  private async handleGetTemplates(args: any) {
    const url = args.url as string;

    if (!url) {
      throw new McpError(ErrorCode.InvalidParams, 'url is required');
    }

    const siteStructure = this.getCachedSiteStructure(url);
    if (!siteStructure) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'Site not analyzed yet. Run analyze_site first.'
      );
    }

    const templates = Array.from(siteStructure.templates.entries()).map(([type, template]) => ({
      type,
      urlPattern: template.urlPattern,
      exampleUrls: template.exampleUrls,
      characteristics: template.characteristics,
      detectedElements: template.detectedElements,
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            domain: siteStructure.domain,
            totalTemplates: templates.length,
            templates,
            explanation: 'Templates represent the different page types on the site. For example, there is typically one PDP (Product Detail Page) template that displays any product, rather than separate pages for each product.',
          }, null, 2),
        },
      ],
    };
  }

  /**
   * Handle generate_crawl_scenarios tool
   */
  private async handleGenerateScenarios(args: any) {
    const url = args.url as string;
    const format = (args.format as string) || 'json';

    if (!url) {
      throw new McpError(ErrorCode.InvalidParams, 'url is required');
    }

    const siteStructure = this.getCachedSiteStructure(url);
    if (!siteStructure) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'Site not analyzed yet. Run analyze_site first.'
      );
    }

    const scenarios = this.scenarioGenerator.generateScenarios(siteStructure);

    if (format === 'json') {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              domain: siteStructure.domain,
              scenarios: scenarios.map(s => ({
                name: s.name,
                description: s.description,
                expectedTemplates: s.expectedTemplates,
                steps: s.steps,
              })),
            }, null, 2),
          },
        ],
      };
    } else if (format === 'python' || format === 'javascript') {
      const code = scenarios.map(scenario => 
        this.scenarioGenerator.generateSeleniumCode(scenario, format)
      ).join('\n\n' + '='.repeat(80) + '\n\n');

      return {
        content: [
          {
            type: 'text',
            text: code,
          },
        ],
      };
    }

    throw new McpError(ErrorCode.InvalidParams, 'Invalid format. Use json, python, or javascript');
  }

  /**
   * Simple in-memory cache for site structures
   */
  private siteCache = new Map<string, SiteStructure>();

  private cacheSiteStructure(url: string, structure: SiteStructure): void {
    this.siteCache.set(url, structure);
  }

  private getCachedSiteStructure(url: string): SiteStructure | undefined {
    return this.siteCache.get(url);
  }

  /**
   * Start the server
   */
  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Site Audit MCP Server running on stdio');
  }
}

// Start the server
const server = new SiteAuditServer();
server.run().catch(console.error);
