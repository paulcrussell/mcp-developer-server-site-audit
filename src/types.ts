/**
 * Types for site audit analysis
 */

export interface PageTemplate {
  type: PageTemplateType;
  urlPattern: string;
  exampleUrls: string[];
  characteristics: string[];
  detectedElements: string[];
}

export enum PageTemplateType {
  PDP = "Product Detail Page",
  PLP = "Product Listing Page",
  CATEGORY = "Category Page",
  HOME = "Home Page",
  SEARCH = "Search Results Page",
  CART = "Cart Page",
  CHECKOUT = "Checkout Page",
  ACCOUNT = "Account Page",
  CONTENT = "Content/CMS Page",
  UNKNOWN = "Unknown"
}

export interface SiteEntity {
  type: EntityType;
  name: string;
  url: string;
  parentCategory?: string;
  metadata?: Record<string, any>;
}

export enum EntityType {
  CATEGORY = "category",
  SUBCATEGORY = "subcategory",
  BRAND = "brand",
  COLLECTION = "collection"
}

export interface SiteStructure {
  domain: string;
  analyzedAt: string;
  templates: Map<PageTemplateType, PageTemplate>;
  entities: SiteEntity[];
  siteMap?: string[];
  robotsTxt?: string;
}

export interface CrawlScenario {
  name: string;
  description: string;
  steps: CrawlStep[];
  expectedTemplates: PageTemplateType[];
}

export interface CrawlStep {
  action: CrawlAction;
  target?: string;
  selector?: string;
  value?: string;
  waitFor?: string;
  description: string;
}

export enum CrawlAction {
  NAVIGATE = "navigate",
  CLICK = "click",
  TYPE = "type",
  WAIT = "wait",
  SCROLL = "scroll",
  EXTRACT = "extract",
  VERIFY_TEMPLATE = "verifyTemplate"
}

export interface AnalysisResult {
  success: boolean;
  siteStructure?: SiteStructure;
  error?: string;
  crawlScenarios?: CrawlScenario[];
}
