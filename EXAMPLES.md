# Example Usage

This document provides examples of how to use the MCP Site Audit Server.

## Quick Start Example

1. **Analyze an ecommerce site:**

```json
Tool: analyze_site
Input: {
  "url": "https://www.example-store.com",
  "maxPages": 50
}
```

Expected output:
```json
{
  "success": true,
  "domain": "https://www.example-store.com",
  "analyzedAt": "2024-01-15T10:30:00.000Z",
  "summary": {
    "templatesFound": 4,
    "categoriesFound": 12,
    "subcategoriesFound": 3,
    "pagesAnalyzed": 47
  },
  "templates": [
    {
      "type": "Home Page",
      "urlPattern": "/",
      "exampleUrls": ["https://www.example-store.com"],
      "characteristics": ["Root URL", "Has hero banner", "Has navigation menu"],
      "detectedElements": ["Navigation", "Footer"]
    },
    {
      "type": "Product Detail Page",
      "urlPattern": "/product/:id",
      "exampleUrls": ["https://www.example-store.com/product/laptop-xyz"],
      "characteristics": ["Has product title", "Has add to cart button", "Has product images"],
      "detectedElements": ["Navigation", "Footer", "Product Grid"]
    },
    {
      "type": "Category Page",
      "urlPattern": "/category/:id",
      "exampleUrls": ["https://www.example-store.com/category/electronics"],
      "characteristics": ["Has product grid", "Has filters/facets", "Has multiple product links"],
      "detectedElements": ["Navigation", "Footer", "Product Grid"]
    }
  ],
  "categories": [
    {
      "type": "category",
      "name": "Electronics",
      "url": "https://www.example-store.com/category/electronics"
    },
    {
      "type": "category",
      "name": "Clothing",
      "url": "https://www.example-store.com/category/clothing"
    }
  ]
}
```

2. **Get all categories:**

```json
Tool: get_site_categories
Input: {
  "url": "https://www.example-store.com"
}
```

3. **Generate Python Selenium scripts:**

```json
Tool: generate_crawl_scenarios
Input: {
  "url": "https://www.example-store.com",
  "format": "python"
}
```

Output will be Python code like:

```python
#!/usr/bin/env python3
"""
Homepage Verification
Verify homepage loads correctly and extract navigation
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
import time

def homepage_verification():
    # Setup Chrome driver
    driver = webdriver.Chrome()
    driver.maximize_window()
    
    try:

        # Navigate to homepage
        driver.get("https://www.example-store.com")
        time.sleep(2)

        # Wait for page to load
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "nav, header"))
        )

        # Verify homepage template
        print(f"Verifying template: Home Page")

        # Extract navigation links
        elements = driver.find_elements(By.CSS_SELECTOR, "nav a, header nav a")
        print(f"Found {len(elements)} elements matching 'nav a, header nav a'")

        print("✓ Scenario completed successfully")
        
    except Exception as e:
        print(f"✗ Scenario failed: {e}")
        driver.save_screenshot("error_screenshot.png")
        raise
    finally:
        driver.quit()

if __name__ == "__main__":
    homepage_verification()
```

## Real-World Scenarios

### Scenario 1: Site Migration Assessment

**Goal**: Understand all page templates before migrating to a new platform

```
1. Run analyze_site with comprehensive page limit
2. Review get_page_templates to see all template types
3. Document which templates need to be recreated
```

### Scenario 2: QA Automation Setup

**Goal**: Create automated tests for all major site sections

```
1. Run analyze_site
2. Run generate_crawl_scenarios with format: "python"
3. Integrate generated scripts into CI/CD pipeline
```

### Scenario 3: Competitive Analysis

**Goal**: Understand competitor site structure

```
1. Run analyze_site on competitor domains
2. Compare template types and URL patterns
3. Identify categories they have that you don't
```

### Scenario 4: SEO Category Audit

**Goal**: Ensure all categories are discoverable

```
1. Run analyze_site
2. Run get_site_categories
3. Cross-reference with expected category list
4. Identify missing categories from navigation
```

## Understanding the Output

### Template Types Explained

- **PDP (Product Detail Page)**: Shows individual product details
  - Example: `/product/laptop-xyz-123`
  - Key elements: Add to cart, product images, price, SKU

- **PLP (Product Listing Page)**: Lists multiple products
  - Example: `/products?category=electronics`
  - Key elements: Product grid, filters, pagination

- **Category Page**: Shows category landing with products
  - Example: `/category/electronics`
  - Key elements: Category description, product grid, subcategories

- **Home Page**: Site landing page
  - Example: `/`
  - Key elements: Hero banner, navigation, featured products

### Entity Types Explained

- **Category**: Top-level navigation item
  - Example: "Electronics", "Clothing", "Home & Garden"

- **Subcategory**: Child of a category
  - Example: "Laptops" (under "Electronics")

- **Brand**: Manufacturer or brand pages
  - Example: "Apple", "Samsung"

- **Collection**: Curated product groups
  - Example: "Summer Sale", "New Arrivals"

## Advanced Usage

### Increasing Coverage

For large sites, increase the page limit:

```json
{
  "url": "https://large-site.com",
  "maxPages": 200
}
```

### Integrating with CI/CD

1. Generate scenarios: `format: "python"`
2. Save to `tests/` directory
3. Add to test suite:

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run site audit tests
        run: python tests/homepage_verification.py
```

### Custom Selectors

If the auto-detection doesn't work perfectly, you can:
1. Review the generated Selenium code
2. Adjust selectors based on actual site structure
3. Add custom wait conditions

## Troubleshooting

### "Site not analyzed yet"
- Make sure to run `analyze_site` before other tools
- Cache is in-memory, so restart requires re-analysis

### Few templates detected
- Increase `maxPages` parameter
- Site might have dynamic JavaScript content
- Check if robots.txt blocks crawling

### Missing categories
- Some categories might be in dropdown menus not detected
- Check the site's sitemap.xml for complete list
- Increase crawling depth with higher maxPages

## Best Practices

1. **Start Small**: Use low maxPages (20-30) for initial analysis
2. **Review Output**: Check if detected templates make sense
3. **Iterate**: Adjust maxPages based on site size
4. **Document Findings**: Keep analysis results for future reference
5. **Test Scripts**: Always review and test generated Selenium code before production use

## Next Steps

- Review the main [README.md](README.md) for full documentation
- Check [mcp-config.example.json](mcp-config.example.json) for MCP client setup
- Explore the source code to understand detection logic
- Contribute improvements via GitHub issues/PRs
