/**
 * Site crawler for analyzing page templates and entities
 */

import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import {
  PageTemplate,
  PageTemplateType,
  SiteEntity,
  EntityType,
  SiteStructure
} from './types.js';

export class SiteCrawler {
  private baseUrl: string;
  private visitedUrls: Set<string> = new Set();
  private maxPages: number;

  constructor(baseUrl: string, maxPages: number = 50) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.maxPages = maxPages;
  }

  /**
   * Analyze a site to identify templates and entities
   */
  async analyzeSite(): Promise<SiteStructure> {
    const templates = new Map<PageTemplateType, PageTemplate>();
    const entities: SiteEntity[] = [];
    const siteMap: string[] = [];

    // Fetch robots.txt
    const robotsTxt = await this.fetchRobotsTxt();

    // Start with homepage
    const homepageHtml = await this.fetchPage(this.baseUrl);
    if (homepageHtml) {
      const homeTemplate = await this.analyzePageTemplate(this.baseUrl, homepageHtml);
      templates.set(PageTemplateType.HOME, homeTemplate);

      // Extract navigation links to find categories
      const $ = cheerio.load(homepageHtml);
      const categoryLinks = this.extractCategoryLinks($);
      
      for (const link of categoryLinks) {
        if (this.visitedUrls.size >= this.maxPages) break;
        
        const fullUrl = this.resolveUrl(link.url);
        if (!this.shouldVisit(fullUrl)) continue;

        const html = await this.fetchPage(fullUrl);
        if (html) {
          siteMap.push(fullUrl);
          const template = await this.analyzePageTemplate(fullUrl, html);
          
          // Categorize the page
          if (template.type === PageTemplateType.CATEGORY || 
              template.type === PageTemplateType.PLP) {
            entities.push({
              type: EntityType.CATEGORY,
              name: link.text,
              url: fullUrl
            });
            
            if (!templates.has(template.type)) {
              templates.set(template.type, template);
            }
          }
          
          // Extract products from category pages to identify PDP pattern
          if (template.type === PageTemplateType.CATEGORY || 
              template.type === PageTemplateType.PLP) {
            const $page = cheerio.load(html);
            const productLinks = this.extractProductLinks($page);
            
            // Sample one product to identify PDP template
            if (productLinks.length > 0 && !templates.has(PageTemplateType.PDP)) {
              const productUrl = this.resolveUrl(productLinks[0].url);
              const productHtml = await this.fetchPage(productUrl);
              if (productHtml) {
                const pdpTemplate = await this.analyzePageTemplate(productUrl, productHtml);
                if (pdpTemplate.type === PageTemplateType.PDP) {
                  templates.set(PageTemplateType.PDP, pdpTemplate);
                }
              }
            }
          }
        }
      }
    }

    return {
      domain: this.baseUrl,
      analyzedAt: new Date().toISOString(),
      templates,
      entities,
      siteMap,
      robotsTxt
    };
  }

  /**
   * Analyze a page to determine its template type
   */
  private async analyzePageTemplate(url: string, html: string): Promise<PageTemplate> {
    const $ = cheerio.load(html);
    const characteristics: string[] = [];
    const detectedElements: string[] = [];

    // Detect page type based on content and structure
    let type = PageTemplateType.UNKNOWN;

    // Check for product detail page indicators
    if (this.isProductDetailPage($)) {
      type = PageTemplateType.PDP;
      characteristics.push('Has product title', 'Has add to cart button', 'Has product images');
    }
    // Check for category/listing page indicators
    else if (this.isCategoryPage($)) {
      type = PageTemplateType.CATEGORY;
      characteristics.push('Has product grid', 'Has filters/facets', 'Has multiple product links');
    }
    // Check for homepage indicators
    else if (url === this.baseUrl || url === this.baseUrl + '/') {
      type = PageTemplateType.HOME;
      characteristics.push('Root URL', 'Has hero banner', 'Has navigation menu');
    }
    // Check for cart page
    else if (this.isCartPage($, url)) {
      type = PageTemplateType.CART;
      characteristics.push('Has cart items', 'Has checkout button');
    }
    // Check for search results
    else if (this.isSearchPage($, url)) {
      type = PageTemplateType.SEARCH;
      characteristics.push('Has search results', 'Has search query');
    }

    // Extract detected elements
    if ($('nav, header nav, .navigation, [role="navigation"]').length > 0) {
      detectedElements.push('Navigation');
    }
    if ($('footer').length > 0) {
      detectedElements.push('Footer');
    }
    if ($('[class*="product"], [class*="item"]').length > 5) {
      detectedElements.push('Product Grid');
    }

    // Extract URL pattern
    const urlPattern = this.extractUrlPattern(url);

    return {
      type,
      urlPattern,
      exampleUrls: [url],
      characteristics,
      detectedElements
    };
  }

  /**
   * Check if page is a product detail page
   */
  private isProductDetailPage($: cheerio.CheerioAPI): boolean {
    const indicators = [
      $('[class*="add-to-cart"], [class*="addToCart"], button').filter((_, el) => 
        $(el).text().toLowerCase().includes('add') && $(el).text().toLowerCase().includes('cart')
      ).length > 0,
      $('[class*="product-title"], [class*="productTitle"], h1[class*="product"]').length > 0,
      $('[class*="product-image"], [class*="productImage"], .product-gallery').length > 0,
      $('[class*="price"]').length > 0 && $('[class*="price"]').length < 10,
      $('[class*="sku"], [class*="product-id"]').length > 0
    ];

    return indicators.filter(Boolean).length >= 2;
  }

  /**
   * Check if page is a category or listing page
   */
  private isCategoryPage($: cheerio.CheerioAPI): boolean {
    const productLinks = $('a[href*="/product"], a[href*="/p/"], a[class*="product"]').length;
    const hasFilters = $('[class*="filter"], [class*="facet"], [class*="refine"]').length > 0;
    const hasPagination = $('[class*="pagination"], [class*="pager"]').length > 0;

    return productLinks > 5 || (productLinks > 2 && (hasFilters || hasPagination));
  }

  /**
   * Check if page is a cart page
   */
  private isCartPage($: cheerio.CheerioAPI, url: string): boolean {
    return (
      url.includes('/cart') ||
      url.includes('/basket') ||
      $('[class*="cart"], [class*="basket"]').length > 3
    );
  }

  /**
   * Check if page is a search results page
   */
  private isSearchPage($: cheerio.CheerioAPI, url: string): boolean {
    return (
      url.includes('search') ||
      url.includes('?q=') ||
      url.includes('?query=') ||
      $('[class*="search-results"]').length > 0
    );
  }

  /**
   * Extract category links from navigation
   */
  private extractCategoryLinks($: cheerio.CheerioAPI): Array<{ text: string; url: string }> {
    const links: Array<{ text: string; url: string }> = [];
    const seen = new Set<string>();

    // Look for navigation menus
    const navSelectors = [
      'nav a',
      'header nav a',
      '[role="navigation"] a',
      '.navigation a',
      '.menu a',
      '.nav-menu a',
      '[class*="category"] a',
      '[class*="navigation"] a'
    ];

    for (const selector of navSelectors) {
      $(selector).each((_, elem) => {
        const $link = $(elem);
        const href = $link.attr('href');
        const text = $link.text().trim();

        if (href && text && !seen.has(href)) {
          // Filter out non-category links
          if (this.looksLikeCategoryLink(href, text)) {
            seen.add(href);
            links.push({ text, url: href });
          }
        }
      });
    }

    return links.slice(0, 20); // Limit to avoid over-crawling
  }

  /**
   * Extract product links from a page
   */
  private extractProductLinks($: cheerio.CheerioAPI): Array<{ text: string; url: string }> {
    const links: Array<{ text: string; url: string }> = [];
    const seen = new Set<string>();

    const productSelectors = [
      'a[href*="/product"]',
      'a[href*="/p/"]',
      'a[href*="/item"]',
      'a[class*="product"]',
      '[class*="product"] a'
    ];

    for (const selector of productSelectors) {
      $(selector).each((_, elem) => {
        const $link = $(elem);
        const href = $link.attr('href');
        const text = $link.text().trim();

        if (href && !seen.has(href)) {
          seen.add(href);
          links.push({ text, url: href });
        }
      });
    }

    return links.slice(0, 10); // Sample a few products
  }

  /**
   * Check if a link looks like a category link
   */
  private looksLikeCategoryLink(href: string, text: string): boolean {
    // Exclude common non-category links
    const excludePatterns = [
      /\/(login|signup|account|profile|cart|checkout|about|contact|help|faq|privacy|terms)/i,
      /\.(jpg|jpeg|png|gif|svg|pdf|zip)$/i,
      /^(mailto:|tel:|#)/,
      /\/(search|blog|news|article)/i
    ];

    for (const pattern of excludePatterns) {
      if (pattern.test(href) || pattern.test(text)) {
        return false;
      }
    }

    // Include patterns that look like categories
    const includePatterns = [
      /\/(category|categories|c|cat|collection|collections|dept|department)/i,
      /^\/[a-z0-9-]+\/?$/  // Simple path like /electronics or /mens-clothing
    ];

    for (const pattern of includePatterns) {
      if (pattern.test(href)) {
        return true;
      }
    }

    // Check if text looks like a category name
    const categoryWords = ['shop', 'men', 'women', 'kids', 'sale', 'new', 'electronics', 'clothing', 'home'];
    const lowerText = text.toLowerCase();
    return categoryWords.some(word => lowerText.includes(word));
  }

  /**
   * Extract URL pattern from a specific URL
   */
  private extractUrlPattern(url: string): string {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      
      // Replace numeric IDs with placeholders
      return path.replace(/\/\d+/g, '/:id')
                 .replace(/\/[a-f0-9-]{20,}/g, '/:uuid')
                 .replace(/\?.*$/, '');
    } catch {
      return url;
    }
  }

  /**
   * Fetch robots.txt
   */
  private async fetchRobotsTxt(): Promise<string | undefined> {
    try {
      const response = await fetch(`${this.baseUrl}/robots.txt`);
      if (response.ok) {
        return await response.text();
      }
    } catch (_error) {
      // Ignore errors
    }
    return undefined;
  }

  /**
   * Fetch a page's HTML content
   */
  private async fetchPage(url: string): Promise<string | null> {
    if (this.visitedUrls.has(url)) {
      return null;
    }

    try {
      this.visitedUrls.add(url);
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SiteAuditBot/1.0)'
        }
      });

      if (response.ok) {
        return await response.text();
      }
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
    }

    return null;
  }

  /**
   * Resolve relative URL to absolute
   */
  private resolveUrl(url: string): string {
    try {
      return new URL(url, this.baseUrl).toString();
    } catch {
      return url;
    }
  }

  /**
   * Check if URL should be visited
   */
  private shouldVisit(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const baseUrlObj = new URL(this.baseUrl);
      
      // Only visit same domain
      if (urlObj.hostname !== baseUrlObj.hostname) {
        return false;
      }

      // Skip common non-content URLs
      const excludePatterns = [
        /\.(jpg|jpeg|png|gif|svg|pdf|zip|css|js|json|xml)$/i,
        /\/(api|cdn|static|assets|media)\//i
      ];

      return !excludePatterns.some(pattern => pattern.test(url));
    } catch {
      return false;
    }
  }
}
