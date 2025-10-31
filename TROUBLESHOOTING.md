# Troubleshooting Guide

## Common Issues and Solutions

### Installation Issues

#### Error: `Cannot find module '@modelcontextprotocol/sdk'`

**Solution:**
```bash
npm install
npm run build
```

Make sure all dependencies are installed before building.

#### TypeScript Compilation Errors

**Solution:**
```bash
# Clean and rebuild
rm -rf dist/
npm run build
```

Ensure you have TypeScript 5.7+ installed.

### Runtime Issues

#### "Site not analyzed yet" Error

**Problem:** Trying to use `get_site_categories`, `get_page_templates`, or `generate_crawl_scenarios` without first analyzing the site.

**Solution:**
```
1. First run: analyze_site with the URL
2. Then run: other tools with the same URL
```

**Example:**
```json
// Step 1
{ "tool": "analyze_site", "url": "https://example.com" }

// Step 2 (now this works)
{ "tool": "get_site_categories", "url": "https://example.com" }
```

**Note:** Cache is in-memory, so restarting the server requires re-analysis.

#### Network Timeout Errors

**Problem:** Site takes too long to respond or has rate limiting.

**Solution:**
- Reduce `maxPages` parameter (try 20 instead of 50)
- Check if site is accessible from your network
- Verify robots.txt doesn't block crawling
- Some sites block automated requests

#### Few or No Templates Detected

**Problem:** Only 1-2 templates found, or none at all.

**Possible Causes & Solutions:**

1. **Not enough pages crawled**
   - Increase `maxPages` to 100-200
   - Large sites need more pages to find all templates

2. **JavaScript-heavy SPA**
   - Site renders content with JavaScript
   - Current version uses static HTML parsing
   - Future version will support Puppeteer for SPAs

3. **Site blocks crawlers**
   - Check robots.txt
   - Verify User-Agent isn't blocked
   - Try with different headers

4. **Unusual site structure**
   - Site might use non-standard patterns
   - Templates might not match detection criteria
   - Review detection logic and adjust

**Example - Increase Pages:**
```json
{
  "url": "https://large-site.com",
  "maxPages": 150
}
```

#### Missing Categories

**Problem:** Known categories aren't in the results.

**Possible Causes:**

1. **Hidden in dropdown menus**
   - Static HTML parser can't see JavaScript menus
   - Categories might be loaded dynamically

2. **Not in main navigation**
   - Categories might be in footer or sidebar
   - Adjust extraction selectors

3. **Need more crawling depth**
   - Increase `maxPages`
   - Some categories are deeper in the site structure

**Solution:**
- Cross-reference with site's sitemap.xml
- Manually check navigation structure
- Increase crawling depth

### Selenium Code Issues

#### Generated Code Doesn't Run

**Problem:** Python or JavaScript code has syntax errors or doesn't work.

**Solutions:**

1. **Missing Selenium Dependencies**
   ```bash
   # Python
   pip install selenium
   
   # JavaScript
   npm install selenium-webdriver
   ```

2. **ChromeDriver Not Installed**
   ```bash
   # Python
   pip install webdriver-manager
   
   # JavaScript
   npm install chromedriver
   ```

3. **Selectors Too Generic**
   - Generated selectors might not match actual elements
   - Manually adjust selectors based on site structure
   - Add more specific wait conditions

**Example Fix:**
```python
# Generated (might be too generic)
element = driver.find_element(By.CSS_SELECTOR, "button")

# Fixed (more specific)
element = driver.find_element(By.CSS_SELECTOR, "button.add-to-cart-button")
```

#### Test Fails on Specific Site

**Problem:** Generated test works on one site but fails on another.

**Solution:**
- Each site is unique
- Generated code is a starting point
- Customize selectors and waits for each site
- Add site-specific logic

### MCP Integration Issues

#### Server Won't Start

**Problem:** Error when starting the MCP server.

**Solution:**
```bash
# Check the build
npm run build

# Test server manually
node dist/index.js
# Should print: "Site Audit MCP Server running on stdio"
# Press Ctrl+C to stop
```

**Common Errors:**
- Missing dependencies: Run `npm install`
- TypeScript not compiled: Run `npm run build`
- Node version too old: Requires Node 18+

#### MCP Client Can't Connect

**Problem:** Claude Desktop or other MCP client can't connect to server.

**Solution:**

1. **Check Configuration Path**
   ```json
   {
     "mcpServers": {
       "site-audit": {
         "command": "node",
         "args": ["/absolute/path/to/dist/index.js"]
       }
     }
   }
   ```
   - Use absolute path, not relative
   - Verify path exists: `ls /path/to/dist/index.js`

2. **Check Node is in PATH**
   ```bash
   which node
   # Should output path to node
   ```

3. **Test Server Standalone**
   ```bash
   echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js
   ```

4. **Check MCP Client Logs**
   - Look for error messages in client logs
   - Common: path not found, permission denied

#### Tools Not Showing in Client

**Problem:** MCP server connects but tools aren't visible.

**Solution:**
- Restart MCP client
- Check server logs for errors
- Verify server implements ListToolsRequest
- Test with manual request:
  ```bash
  echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node dist/index.js
  ```

### Analysis Quality Issues

#### Incorrect Template Classification

**Problem:** PDP classified as Category, or vice versa.

**Explanation:**
- Detection is heuristic-based
- Some pages have ambiguous structure
- Edge cases may be misclassified

**Solution:**
- Review characteristics in output
- Adjust detection thresholds if needed
- File issue with example URL

**Current Detection Logic:**
```typescript
// PDP: 2+ of these indicators
- Add to cart button
- Product title
- Product images
- Price (but not many)
- SKU/product ID

// Category: Product links > 5 OR (>2 AND has filters)
```

#### Duplicate Categories

**Problem:** Same category appears multiple times.

**Solution:**
- Already deduplicated by URL
- Different text might refer to same URL
- Check URL patterns to identify duplicates

#### Wrong URL Pattern

**Problem:** Pattern doesn't match actual URLs.

**Example:**
```
Detected: /category/:id
Actual:   /cat/:id/:slug
```

**Solution:**
- Pattern extraction is best-effort
- Use as guidance, not exact specification
- Review actual URLs in exampleUrls

### Performance Issues

#### Analysis Takes Too Long

**Problem:** analyze_site runs for >10 minutes.

**Solutions:**

1. **Reduce maxPages**
   - Default 50 is reasonable
   - Try 20-30 for quick analysis

2. **Network is slow**
   - Check internet connection
   - Site might be slow to respond
   - Some sites have rate limiting

3. **Site is very large**
   - Large sites need more time
   - Consider if you need all pages
   - Sample fewer pages per category

#### High Memory Usage

**Problem:** Server uses too much memory.

**Solutions:**
- Reduce maxPages
- Clear cache between analyses
- Restart server periodically

**Typical Usage:**
- 50 pages: ~10MB
- 200 pages: ~40MB
- Cache: ~1MB per site

### Data Accuracy Issues

#### Missing Products in Output

**Expected Behavior:** The tool SHOULD NOT list all products.

**Explanation:**
- Design goal: Find templates, not all entities
- One PDP template serves all products
- You don't need to know about all 10,000 products
- You DO need to know about all 50 categories

**If you need product data:**
- This tool isn't designed for that
- Use product feed/API instead
- Or use dedicated product scraper

#### Categories Have No URL

**Problem:** Some categories have missing URLs.

**Possible Causes:**
- JavaScript-based navigation
- Categories are filters, not pages
- Dynamic content loading

**Solution:**
- Check if category is actually a page
- Some "categories" are just filters
- Verify by manually clicking in browser

## Getting Help

### Debug Mode

Add console logging to see what's happening:

```typescript
// In crawler.ts, add logging
console.error('Fetching:', url);
console.error('Found templates:', templates.size);
console.error('Found entities:', entities.length);
```

### Reporting Issues

When reporting issues, include:

1. **MCP Server Version**: Check package.json
2. **Node Version**: `node --version`
3. **Error Message**: Full error text
4. **Site URL**: (if public) URL being analyzed
5. **Configuration**: Your analyze_site parameters
6. **Expected vs Actual**: What you expected vs what happened

### Example Issue Report

```
Title: Not detecting PDP on site XYZ

Environment:
- MCP Site Audit Server v1.0.0
- Node v20.10.0
- Site: https://example-store.com

Problem:
analyze_site detects Category and Home templates, but not PDP.

Steps to Reproduce:
1. Run analyze_site with url: https://example-store.com
2. Run get_page_templates

Expected: Should find PDP template
Actual: Only finds Home and Category templates

Additional Info:
- Site has products at /product/{id} pattern
- Products have "Add to Cart" buttons
- Manually verified products exist
```

## Advanced Troubleshooting

### Testing Detection Logic

Create a test file to check template detection:

```typescript
// test-detection.ts
import { SiteCrawler } from './crawler.js';
import * as cheerio from 'cheerio';
import * as fs from 'fs';

// Save a page's HTML
const html = fs.readFileSync('test-page.html', 'utf-8');
const $ = cheerio.load(html);

// Test detection manually
const crawler = new SiteCrawler('https://test.com', 1);
// Access private methods via TypeScript tricks
```

### Debugging MCP Protocol

Capture MCP communication:

```bash
# Run server with debug output
DEBUG=* node dist/index.js 2>debug.log

# Or capture stdin/stdout
node dist/index.js <input.json >output.json 2>errors.log
```

### Testing Selectors

Before using generated Selenium code, test selectors in browser console:

```javascript
// In browser developer console
document.querySelectorAll('[class*="product"]').length
document.querySelectorAll('button:contains("Add")').length

// Test CSS selectors match expected elements
```

## Best Practices

### 1. Start Small
- Use maxPages: 20 for first test
- Verify output makes sense
- Then increase to 50-100

### 2. Validate Results
- Review template characteristics
- Check URL patterns
- Verify categories make sense

### 3. Iterate
- Adjust parameters based on results
- Re-analyze with different settings
- Fine-tune for specific site

### 4. Test Generated Code
- Always test Selenium scripts before use
- Adjust selectors as needed
- Add error handling

### 5. Cache Management
- Remember cache is in-memory
- Re-analyze after server restart
- Consider saving results to file

## FAQ

**Q: Why isn't my site being analyzed?**
A: Check robots.txt, network access, and try with smaller maxPages.

**Q: Can I analyze sites behind authentication?**
A: Not currently. Tool only works with public pages.

**Q: Why so few products detected?**
A: By design! Tool finds templates, not all products.

**Q: Can I run this in production?**
A: Yes, but add rate limiting, monitoring, and persistent storage.

**Q: Does this work with SPAs?**
A: Partially. Better support coming with Puppeteer integration.

**Q: How do I increase crawl speed?**
A: Currently sequential. Future version will support parallel requests.

**Q: Can I crawl multiple sites?**
A: Yes! Each site is cached separately by URL.

**Q: Does this respect robots.txt?**
A: Yes, it fetches and should respect it (enforcement in future version).

## Need More Help?

- Check [README.md](README.md) for usage guide
- Read [ARCHITECTURE.md](ARCHITECTURE.md) for technical details
- See [EXAMPLES.md](EXAMPLES.md) for usage examples
- File an issue on GitHub with details
