/**
 * Generate Selenium crawling scenarios based on site analysis
 */

import {
  CrawlScenario,
  CrawlStep,
  CrawlAction,
  PageTemplateType,
  SiteStructure,
  SiteEntity,
  EntityType
} from './types.js';

export class ScenarioGenerator {
  /**
   * Generate crawling scenarios based on site structure
   */
  generateScenarios(siteStructure: SiteStructure): CrawlScenario[] {
    const scenarios: CrawlScenario[] = [];

    // Homepage verification scenario
    scenarios.push(this.createHomepageScenario(siteStructure));

    // Category browsing scenario
    if (siteStructure.entities.length > 0) {
      scenarios.push(this.createCategoryBrowsingScenario(siteStructure));
    }

    // Product detail scenario
    if (siteStructure.templates.has(PageTemplateType.PDP)) {
      scenarios.push(this.createProductDetailScenario(siteStructure));
    }

    // Search scenario
    if (siteStructure.templates.has(PageTemplateType.SEARCH)) {
      scenarios.push(this.createSearchScenario(siteStructure));
    }

    // Full site crawl scenario
    scenarios.push(this.createFullCrawlScenario(siteStructure));

    return scenarios;
  }

  /**
   * Generate Python/Selenium code for a scenario
   */
  generateSeleniumCode(scenario: CrawlScenario, language: 'python' | 'javascript' = 'python'): string {
    if (language === 'python') {
      return this.generatePythonSeleniumCode(scenario);
    } else {
      return this.generateJavaScriptSeleniumCode(scenario);
    }
  }

  /**
   * Create homepage verification scenario
   */
  private createHomepageScenario(siteStructure: SiteStructure): CrawlScenario {
    const steps: CrawlStep[] = [
      {
        action: CrawlAction.NAVIGATE,
        target: siteStructure.domain,
        description: 'Navigate to homepage'
      },
      {
        action: CrawlAction.WAIT,
        waitFor: 'nav, header',
        description: 'Wait for page to load'
      },
      {
        action: CrawlAction.VERIFY_TEMPLATE,
        value: PageTemplateType.HOME,
        description: 'Verify homepage template'
      },
      {
        action: CrawlAction.EXTRACT,
        selector: 'nav a, header nav a',
        description: 'Extract navigation links'
      }
    ];

    return {
      name: 'Homepage Verification',
      description: 'Verify homepage loads correctly and extract navigation',
      steps,
      expectedTemplates: [PageTemplateType.HOME]
    };
  }

  /**
   * Create category browsing scenario
   */
  private createCategoryBrowsingScenario(siteStructure: SiteStructure): CrawlScenario {
    const steps: CrawlStep[] = [
      {
        action: CrawlAction.NAVIGATE,
        target: siteStructure.domain,
        description: 'Navigate to homepage'
      }
    ];

    // Add steps for each category
    const categories = siteStructure.entities.filter(e => e.type === EntityType.CATEGORY);
    for (const category of categories.slice(0, 5)) { // Limit to 5 categories
      steps.push({
        action: CrawlAction.NAVIGATE,
        target: category.url,
        description: `Navigate to ${category.name} category`
      });
      steps.push({
        action: CrawlAction.WAIT,
        waitFor: '[class*="product"], [class*="item"]',
        description: 'Wait for products to load'
      });
      steps.push({
        action: CrawlAction.VERIFY_TEMPLATE,
        value: PageTemplateType.CATEGORY,
        description: 'Verify category page template'
      });
      steps.push({
        action: CrawlAction.EXTRACT,
        selector: 'a[href*="/product"], a[href*="/p/"]',
        description: 'Extract product links'
      });
    }

    return {
      name: 'Category Browsing',
      description: 'Browse through site categories and verify category pages',
      steps,
      expectedTemplates: [PageTemplateType.CATEGORY, PageTemplateType.PLP]
    };
  }

  /**
   * Create product detail scenario
   */
  private createProductDetailScenario(siteStructure: SiteStructure): CrawlScenario {
    const pdpTemplate = siteStructure.templates.get(PageTemplateType.PDP);
    const exampleUrl = pdpTemplate?.exampleUrls[0] || '';

    const steps: CrawlStep[] = [
      {
        action: CrawlAction.NAVIGATE,
        target: exampleUrl,
        description: 'Navigate to product detail page'
      },
      {
        action: CrawlAction.WAIT,
        waitFor: '[class*="product-title"], h1',
        description: 'Wait for product details to load'
      },
      {
        action: CrawlAction.VERIFY_TEMPLATE,
        value: PageTemplateType.PDP,
        description: 'Verify product detail page template'
      },
      {
        action: CrawlAction.EXTRACT,
        selector: '[class*="price"]',
        description: 'Extract product price'
      },
      {
        action: CrawlAction.EXTRACT,
        selector: '[class*="product-title"], h1',
        description: 'Extract product title'
      },
      {
        action: CrawlAction.EXTRACT,
        selector: '[class*="add-to-cart"], [class*="addToCart"], button',
        description: 'Verify add to cart button exists'
      }
    ];

    return {
      name: 'Product Detail Verification',
      description: 'Verify product detail page structure and elements',
      steps,
      expectedTemplates: [PageTemplateType.PDP]
    };
  }

  /**
   * Create search scenario
   */
  private createSearchScenario(siteStructure: SiteStructure): CrawlScenario {
    const steps: CrawlStep[] = [
      {
        action: CrawlAction.NAVIGATE,
        target: siteStructure.domain,
        description: 'Navigate to homepage'
      },
      {
        action: CrawlAction.WAIT,
        waitFor: 'input[type="search"], [class*="search"]',
        description: 'Wait for search box'
      },
      {
        action: CrawlAction.TYPE,
        selector: 'input[type="search"], [class*="search"] input',
        value: 'test',
        description: 'Enter search query'
      },
      {
        action: CrawlAction.CLICK,
        selector: 'button[type="submit"], [class*="search"] button',
        description: 'Submit search'
      },
      {
        action: CrawlAction.WAIT,
        waitFor: '[class*="result"], [class*="product"]',
        description: 'Wait for search results'
      },
      {
        action: CrawlAction.VERIFY_TEMPLATE,
        value: PageTemplateType.SEARCH,
        description: 'Verify search results page template'
      }
    ];

    return {
      name: 'Search Functionality',
      description: 'Test search functionality and results page',
      steps,
      expectedTemplates: [PageTemplateType.SEARCH]
    };
  }

  /**
   * Create full site crawl scenario
   */
  private createFullCrawlScenario(siteStructure: SiteStructure): CrawlScenario {
    const steps: CrawlStep[] = [
      {
        action: CrawlAction.NAVIGATE,
        target: siteStructure.domain,
        description: 'Start at homepage'
      }
    ];

    // Add all discovered categories
    const categories = siteStructure.entities.filter(e => e.type === EntityType.CATEGORY);
    for (const category of categories) {
      steps.push({
        action: CrawlAction.NAVIGATE,
        target: category.url,
        description: `Crawl ${category.name}`
      });
    }

    return {
      name: 'Full Site Crawl',
      description: 'Comprehensive crawl of all discovered categories',
      steps,
      expectedTemplates: Array.from(siteStructure.templates.keys())
    };
  }

  /**
   * Generate Python/Selenium code
   */
  private generatePythonSeleniumCode(scenario: CrawlScenario): string {
    let code = `#!/usr/bin/env python3
"""
${scenario.name}
${scenario.description}
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
import time

def ${this.toPythonFunctionName(scenario.name)}():
    # Setup Chrome driver
    driver = webdriver.Chrome()
    driver.maximize_window()
    
    try:
`;

    for (const step of scenario.steps) {
      code += this.generatePythonStep(step);
    }

    code += `
        print("✓ Scenario completed successfully")
        
    except Exception as e:
        print(f"✗ Scenario failed: {e}")
        driver.save_screenshot("error_screenshot.png")
        raise
    finally:
        driver.quit()

if __name__ == "__main__":
    ${this.toPythonFunctionName(scenario.name)}()
`;

    return code;
  }

  /**
   * Generate JavaScript/Selenium code
   */
  private generateJavaScriptSeleniumCode(scenario: CrawlScenario): string {
    let code = `/**
 * ${scenario.name}
 * ${scenario.description}
 */

const { Builder, By, until } = require('selenium-webdriver');

async function ${this.toJavaScriptFunctionName(scenario.name)}() {
  const driver = await new Builder().forBrowser('chrome').build();
  
  try {
`;

    for (const step of scenario.steps) {
      code += this.generateJavaScriptStep(step);
    }

    code += `
    console.log('✓ Scenario completed successfully');
    
  } catch (error) {
    console.error('✗ Scenario failed:', error);
    await driver.takeScreenshot().then(
      image => require('fs').writeFileSync('error_screenshot.png', image, 'base64')
    );
    throw error;
  } finally {
    await driver.quit();
  }
}

${this.toJavaScriptFunctionName(scenario.name)}();
`;

    return code;
  }

  /**
   * Generate Python code for a single step
   */
  private generatePythonStep(step: CrawlStep): string {
    let code = `\n        # ${step.description}\n`;

    switch (step.action) {
      case CrawlAction.NAVIGATE:
        code += `        driver.get("${step.target}")\n`;
        code += `        time.sleep(2)\n`;
        break;

      case CrawlAction.WAIT:
        if (step.waitFor) {
          code += `        WebDriverWait(driver, 10).until(\n`;
          code += `            EC.presence_of_element_located((By.CSS_SELECTOR, "${step.waitFor}"))\n`;
          code += `        )\n`;
        } else {
          code += `        time.sleep(2)\n`;
        }
        break;

      case CrawlAction.CLICK:
        if (step.selector) {
          code += `        element = driver.find_element(By.CSS_SELECTOR, "${step.selector}")\n`;
          code += `        element.click()\n`;
          code += `        time.sleep(1)\n`;
        }
        break;

      case CrawlAction.TYPE:
        if (step.selector && step.value) {
          code += `        element = driver.find_element(By.CSS_SELECTOR, "${step.selector}")\n`;
          code += `        element.send_keys("${step.value}")\n`;
        }
        break;

      case CrawlAction.EXTRACT:
        if (step.selector) {
          code += `        elements = driver.find_elements(By.CSS_SELECTOR, "${step.selector}")\n`;
          code += `        print(f"Found {len(elements)} elements matching '${step.selector}'")\n`;
        }
        break;

      case CrawlAction.SCROLL:
        code += `        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")\n`;
        code += `        time.sleep(1)\n`;
        break;

      case CrawlAction.VERIFY_TEMPLATE:
        code += `        print(f"Verifying template: ${step.value}")\n`;
        break;
    }

    return code;
  }

  /**
   * Generate JavaScript code for a single step
   */
  private generateJavaScriptStep(step: CrawlStep): string {
    let code = `\n    // ${step.description}\n`;

    switch (step.action) {
      case CrawlAction.NAVIGATE:
        code += `    await driver.get("${step.target}");\n`;
        code += `    await driver.sleep(2000);\n`;
        break;

      case CrawlAction.WAIT:
        if (step.waitFor) {
          code += `    await driver.wait(until.elementLocated(By.css("${step.waitFor}")), 10000);\n`;
        } else {
          code += `    await driver.sleep(2000);\n`;
        }
        break;

      case CrawlAction.CLICK:
        if (step.selector) {
          code += `    const clickElement = await driver.findElement(By.css("${step.selector}"));\n`;
          code += `    await clickElement.click();\n`;
          code += `    await driver.sleep(1000);\n`;
        }
        break;

      case CrawlAction.TYPE:
        if (step.selector && step.value) {
          code += `    const inputElement = await driver.findElement(By.css("${step.selector}"));\n`;
          code += `    await inputElement.sendKeys("${step.value}");\n`;
        }
        break;

      case CrawlAction.EXTRACT:
        if (step.selector) {
          code += `    const elements = await driver.findElements(By.css("${step.selector}"));\n`;
          code += `    console.log(\`Found \${elements.length} elements matching '${step.selector}'\`);\n`;
        }
        break;

      case CrawlAction.SCROLL:
        code += `    await driver.executeScript("window.scrollTo(0, document.body.scrollHeight);");\n`;
        code += `    await driver.sleep(1000);\n`;
        break;

      case CrawlAction.VERIFY_TEMPLATE:
        code += `    console.log("Verifying template: ${step.value}");\n`;
        break;
    }

    return code;
  }

  /**
   * Convert scenario name to Python function name
   */
  private toPythonFunctionName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  }

  /**
   * Convert scenario name to JavaScript function name
   */
  private toJavaScriptFunctionName(name: string): string {
    return name.replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
               .replace(/^./, str => str.toLowerCase());
  }
}
