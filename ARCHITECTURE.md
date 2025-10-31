# Architecture Documentation

## System Overview

The MCP Site Audit Server is designed to help ecommerce solution architects understand website information architecture through automated analysis and crawling.

## Core Concepts

### Templates vs Entities Philosophy

**The Problem:**
When analyzing an ecommerce site, you don't need to know about all 10,000 products, but you DO need to know:
- All the page template types (PDP, PLP, Category, etc.)
- All the categories (50-200 typically)
- The URL patterns and structure

**The Solution:**
This tool distinguishes between:
- **Templates**: The layouts/types (one PDP template serves all products)
- **Entities**: The actual content items (individual categories, not products)

## Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│                    MCP Server Layer                      │
│  - Handles MCP protocol communication                    │
│  - Exposes tools to MCP clients                          │
│  - Manages request/response flow                         │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Business Logic Layer                   │
│  - SiteCrawler: Analyzes site structure                 │
│  - ScenarioGenerator: Creates test scenarios            │
│  - Template detection algorithms                         │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Data Processing Layer                  │
│  - HTML parsing (Cheerio)                               │
│  - HTTP requests (node-fetch)                           │
│  - Pattern matching and analysis                        │
└─────────────────────────────────────────────────────────┘
```

## Component Details

### 1. MCP Server (index.ts)

**Responsibilities:**
- Implement MCP protocol
- Define available tools
- Route tool calls to appropriate handlers
- Manage caching (in-memory)

**Tools Exposed:**
- `analyze_site`: Main entry point for analysis
- `get_site_categories`: Query discovered categories
- `get_page_templates`: Query discovered templates
- `generate_crawl_scenarios`: Generate test scripts

### 2. Site Crawler (crawler.ts)

**Responsibilities:**
- Fetch and parse web pages
- Identify page templates
- Extract entities (categories)
- Build site map

**Key Algorithms:**

#### Template Detection
```
For each page:
  1. Analyze DOM structure
  2. Count specific elements (products, filters, etc.)
  3. Check for characteristic patterns
  4. Classify into template type
```

**Detection Criteria:**

**PDP (Product Detail Page):**
- Has "Add to Cart" button
- Has product title (h1)
- Has product images
- Has price element
- Has SKU or product ID
- Confidence: 2+ indicators = PDP

**Category/PLP:**
- Has 5+ product links
- Has filters/facets
- Has pagination
- Shows product grid
- Confidence: Product links > 5 OR (product links > 2 AND filters)

**Homepage:**
- Root URL
- Has hero/banner elements
- Has navigation menu

#### Category Extraction
```
For each navigation link:
  1. Extract href and text
  2. Check if it looks like a category
  3. Exclude utility pages (login, cart, etc.)
  4. Include category patterns (/category/, /c/, etc.)
  5. Validate by checking destination page
```

**URL Pattern Recognition:**
```
/product/laptop-123       → /product/:id
/category/electronics     → /category/:id  
/p/abc123def456           → /p/:uuid
```

### 3. Scenario Generator (scenario-generator.ts)

**Responsibilities:**
- Create test scenarios based on discovered structure
- Generate Selenium code in Python/JavaScript
- Define test steps and expectations

**Scenario Types:**

1. **Homepage Verification**
   - Navigate to homepage
   - Verify template
   - Extract navigation

2. **Category Browsing**
   - Visit each category
   - Verify category page template
   - Extract product links

3. **Product Detail**
   - Visit sample product
   - Verify PDP template
   - Extract product data

4. **Search Functionality**
   - Test search feature
   - Verify results page

5. **Full Site Crawl**
   - Comprehensive crawl
   - Visit all categories

**Code Generation:**
- Python: Using selenium + WebDriverWait
- JavaScript: Using selenium-webdriver
- Includes error handling and screenshots

### 4. Type System (types.ts)

**Key Types:**

```typescript
PageTemplateType: enum
  - PDP, PLP, CATEGORY, HOME, SEARCH, etc.

SiteEntity:
  - type: category | subcategory | brand | collection
  - name, url, parentCategory

SiteStructure:
  - domain, analyzedAt
  - templates: Map<PageTemplateType, PageTemplate>
  - entities: SiteEntity[]
  - siteMap, robotsTxt

CrawlScenario:
  - name, description
  - steps: CrawlStep[]
  - expectedTemplates
```

## Data Flow

### analyze_site Tool Flow

```
User Request
    │
    ▼
MCP Server receives request
    │
    ▼
Create SiteCrawler(url, maxPages)
    │
    ▼
Fetch homepage
    │
    ▼
Analyze homepage template
    │
    ▼
Extract category links
    │
    ▼
For each category (up to maxPages):
    │
    ├─→ Fetch category page
    ├─→ Analyze template
    ├─→ Add to entities if category
    └─→ Sample products to find PDP
    │
    ▼
Build SiteStructure
    │
    ▼
Cache in memory
    │
    ▼
Format response
    │
    ▼
Return to MCP client
```

### generate_crawl_scenarios Flow

```
User Request
    │
    ▼
Retrieve cached SiteStructure
    │
    ▼
ScenarioGenerator.generateScenarios()
    │
    ├─→ Create homepage scenario
    ├─→ Create category browsing scenario
    ├─→ Create PDP scenario
    ├─→ Create search scenario
    └─→ Create full crawl scenario
    │
    ▼
If format == 'python' or 'javascript':
    │
    ├─→ Generate Selenium code for each scenario
    └─→ Combine with separators
    │
    ▼
Return code or JSON
```

## Design Decisions

### 1. In-Memory Caching
**Why:** Simplicity for MVP, single-user scenarios
**Trade-off:** Lost on server restart
**Future:** Could add Redis/file-based persistence

### 2. Cheerio for HTML Parsing
**Why:** Fast, jQuery-like API, works without browser
**Trade-off:** Can't handle JavaScript-rendered content
**Future:** Could add Puppeteer for SPA support

### 3. Pattern-Based Template Detection
**Why:** Works across different platforms/frameworks
**Trade-off:** May miss edge cases
**Future:** Could add ML-based classification

### 4. Sample-Based Product Discovery
**Why:** Don't need all products, just the template
**Trade-off:** Might miss product variations
**Benefit:** Much faster analysis

### 5. Respect robots.txt
**Why:** Ethical crawling, avoid overload
**Trade-off:** May miss restricted content
**Benefit:** Good web citizenship

## Extension Points

### Adding New Template Types

1. Add to `PageTemplateType` enum in types.ts
2. Create detection logic in crawler.ts:
   ```typescript
   private isNewTemplateType($: CheerioAPI): boolean {
     // Detection logic
   }
   ```
3. Update scenario generator with new scenarios

### Adding New Entity Types

1. Add to `EntityType` enum in types.ts
2. Update crawler extraction logic
3. Update category/entity filters

### Supporting SPA/JavaScript Sites

1. Add Puppeteer dependency
2. Create PuppeteerCrawler extends SiteCrawler
3. Override fetchPage() to use headless browser
4. Wait for JavaScript rendering

### Adding Persistent Storage

1. Define storage interface:
   ```typescript
   interface SiteStorage {
     save(url: string, structure: SiteStructure): Promise<void>;
     load(url: string): Promise<SiteStructure | null>;
   }
   ```
2. Implement for Redis/MongoDB/File system
3. Replace in-memory cache in index.ts

## Performance Considerations

### Crawling Speed
- Default: 50 pages limit
- Network I/O bound
- ~2-5 seconds per page
- Total: ~2-4 minutes for default

### Optimization Strategies
1. **Parallel requests**: Could fetch multiple pages simultaneously
2. **Smart sampling**: Visit fewer pages per category
3. **Cache responses**: Reuse fetched pages
4. **Respect rate limits**: Add delays between requests

### Memory Usage
- Each page: ~100KB HTML
- 50 pages: ~5MB
- SiteStructure: <1MB
- Total: ~10MB typical

## Security Considerations

### Input Validation
- URL validation before fetching
- Same-domain checks
- Exclude suspicious patterns

### Rate Limiting
- Max pages limit
- Delays between requests
- Respect robots.txt

### Error Handling
- Network timeouts
- Invalid HTML
- Missing elements
- HTTP errors

## Testing Strategy

### Unit Tests (Future)
- Template detection logic
- URL pattern extraction
- Entity classification
- Code generation

### Integration Tests (Future)
- Crawl test sites
- Verify template detection
- Check scenario generation
- Validate Selenium code

### Manual Testing
- Use test-utility.ts
- Try different site types
- Verify generated code works
- Check edge cases

## Deployment

### Local Development
```bash
npm install
npm run build
node dist/index.js
```

### MCP Client Integration
Add to Claude Desktop config:
```json
{
  "mcpServers": {
    "site-audit": {
      "command": "node",
      "args": ["/path/to/dist/index.js"]
    }
  }
}
```

### Production Considerations
- Add logging (Winston/Bunyan)
- Add monitoring (Prometheus)
- Add persistent storage
- Add rate limiting
- Add authentication if needed

## Future Enhancements

### Phase 2
- [ ] Support for JavaScript-heavy SPAs (Puppeteer)
- [ ] Machine learning for template classification
- [ ] Visual regression testing scenarios
- [ ] API endpoint discovery
- [ ] Sitemap.xml parsing
- [ ] Performance metrics collection

### Phase 3
- [ ] Persistent storage (Redis/MongoDB)
- [ ] Multi-user support
- [ ] Scheduled crawls
- [ ] Change detection/monitoring
- [ ] Reporting dashboard
- [ ] Export to various formats (CSV, PDF)

### Phase 4
- [ ] AI-powered insights
- [ ] Competitive analysis features
- [ ] SEO audit integration
- [ ] Accessibility testing
- [ ] Mobile responsiveness checks

## Troubleshooting

### Common Issues

**"Site not analyzed yet"**
- Run analyze_site first
- Check cache (in-memory, lost on restart)

**"Few templates detected"**
- Increase maxPages
- Site might be SPA (need Puppeteer)
- Check robots.txt restrictions

**"Network errors"**
- Check internet connection
- Verify URL is correct
- Site might block bots

**"Generated code doesn't work"**
- Selectors might be too generic
- Site structure changed
- Adjust selectors manually
- Add custom wait conditions

## Contributing

See main README.md for contribution guidelines.

## References

- [MCP Protocol Specification](https://spec.modelcontextprotocol.io/)
- [Cheerio Documentation](https://cheerio.js.org/)
- [Selenium WebDriver](https://www.selenium.dev/documentation/webdriver/)
- [Web Crawling Best Practices](https://www.robotstxt.org/)
