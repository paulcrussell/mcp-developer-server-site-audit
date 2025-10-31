# MCP Site Audit Server

A Model Context Protocol (MCP) server designed for ecommerce solution architects to analyze website information architecture. This tool identifies page templates vs. entities, discovers all categories, and generates Selenium crawling scenarios.

## Overview

This MCP server helps you understand the structure of ecommerce websites by:
- **Distinguishing templates from entities**: Recognizes that a site has one PDP template that works with N products
- **Discovering all categories**: Finds all categories without needing to identify every product
- **Generating crawl scenarios**: Creates Selenium test scripts for automated crawling

## Key Concepts

### Templates vs. Entities

**Templates** are the page layouts/types on a site:
- PDP (Product Detail Page) - One template for all products
- PLP (Product Listing Page) - Shows lists of products
- Category Page - Shows category content
- Home Page - Landing page
- Cart, Checkout, Search, etc.

**Entities** are the actual content items:
- Categories (e.g., "Electronics", "Clothing")
- Subcategories (e.g., "Laptops", "Smartphones")
- Brands, Collections, etc.

You don't need to know about all 10,000 products, but you do need to know about all 50 categories.

## Installation

### Local Installation

```bash
npm install
npm run build
```

### Docker Deployment

This server can be deployed to Google Cloud Platform (GCP) Cloud Run as a containerized service. See [DOCKER-DEPLOYMENT.md](./DOCKER-DEPLOYMENT.md) for detailed instructions on:
- Building Docker images
- Manual GCP Cloud Run deployment
- Automated deployment with GitHub Actions
- Configuration and monitoring

## Usage

### As an MCP Server

Add to your MCP client configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "site-audit": {
      "command": "node",
      "args": ["/path/to/mcp-developer-server-site-audit/dist/index.js"]
    }
  }
}
```

### Available Tools

#### 1. `analyze_site`

Analyzes a website to identify page templates and entities.

**Parameters:**
- `url` (required): The website URL to analyze
- `maxPages` (optional): Maximum pages to crawl (default: 50)

**Example:**
```json
{
  "url": "https://example-store.com",
  "maxPages": 50
}
```

**Response includes:**
- Identified page templates (PDP, PLP, Category, etc.)
- Discovered categories and subcategories
- URL patterns for each template type
- Characteristics of each template

#### 2. `get_site_categories`

Retrieves all discovered categories from a previously analyzed site.

**Parameters:**
- `url` (required): The website URL that was analyzed

**Example:**
```json
{
  "url": "https://example-store.com"
}
```

#### 3. `get_page_templates`

Gets all identified page templates from a site analysis.

**Parameters:**
- `url` (required): The website URL that was analyzed

**Example:**
```json
{
  "url": "https://example-store.com"
}
```

#### 4. `generate_crawl_scenarios`

Generates Selenium crawling scenarios based on site analysis.

**Parameters:**
- `url` (required): The website URL that was analyzed
- `format` (optional): Output format - `json`, `python`, or `javascript` (default: json)

**Example:**
```json
{
  "url": "https://example-store.com",
  "format": "python"
}
```

**Generates scenarios for:**
- Homepage verification
- Category browsing
- Product detail page verification
- Search functionality
- Full site crawl

## Example Workflow

1. **Analyze a site:**
   ```
   Use analyze_site with url: "https://example-store.com"
   ```

2. **Review discovered categories:**
   ```
   Use get_site_categories with url: "https://example-store.com"
   ```

3. **Check page templates:**
   ```
   Use get_page_templates with url: "https://example-store.com"
   ```

4. **Generate Selenium scripts:**
   ```
   Use generate_crawl_scenarios with url: "https://example-store.com" and format: "python"
   ```

## Technical Details

### How It Works

1. **Crawling**: Starts at the homepage and follows navigation links
2. **Template Detection**: Analyzes page structure to identify template types
3. **Entity Discovery**: Extracts categories from navigation and page structure
4. **Pattern Recognition**: Identifies URL patterns for each template type
5. **Scenario Generation**: Creates test scenarios based on discovered structure

### Detection Logic

**PDP Detection:**
- Has "Add to Cart" button
- Has product title/name
- Has product images
- Has price information
- Has SKU or product ID

**Category Page Detection:**
- Has multiple product links (>5)
- Has filters/facets
- Has pagination
- Shows product grid

**Category Extraction:**
- Found in navigation menus
- Follows category URL patterns
- Excludes utility pages (login, cart, etc.)

## Use Cases

### For Ecommerce Solution Architects

- **Site Audits**: Understand the information architecture of client sites
- **Migration Planning**: Identify all templates that need to be migrated
- **QA Automation**: Generate test scripts for comprehensive site testing
- **Documentation**: Auto-document site structure
- **Competitive Analysis**: Analyze competitor site structures

### For QA Engineers

- **Test Automation**: Generate Selenium scripts for regression testing
- **Smoke Tests**: Quick verification of key page templates
- **Category Coverage**: Ensure all categories are tested

### For Developers

- **Site Mapping**: Understand site structure before making changes
- **Template Inventory**: Know which templates exist and their characteristics
- **Integration Testing**: Generate scenarios for API testing

## Limitations

- Requires publicly accessible websites
- May not detect all templates on first run (increase maxPages)
- JavaScript-heavy SPAs may require additional configuration
- Rate limiting: Respects robots.txt and uses delays between requests

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run watch

# Run directly
node dist/index.js
```

## License

MIT

## Contributing

Contributions welcome! Please feel free to submit issues and pull requests.

## Author

Paul Russell - Ecommerce Solution Architect