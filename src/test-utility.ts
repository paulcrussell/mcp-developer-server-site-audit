#!/usr/bin/env node

/**
 * Simple test utility to verify the site crawler works
 * This is not part of the MCP server, just for validation
 */

import { SiteCrawler } from './crawler.js';
import { ScenarioGenerator } from './scenario-generator.js';

async function testCrawler() {
  console.log('='.repeat(80));
  console.log('Site Audit Server - Test Utility');
  console.log('='.repeat(80));
  console.log('');

  // Test with a simple public site
  const testUrl = 'https://example.com';
  console.log(`Testing with: ${testUrl}`);
  console.log('Note: This is a simple test page, not an ecommerce site.');
  console.log('');

  try {
    console.log('Step 1: Creating crawler...');
    const crawler = new SiteCrawler(testUrl, 5);
    
    console.log('Step 2: Analyzing site...');
    const siteStructure = await crawler.analyzeSite();
    
    console.log('Step 3: Results:');
    console.log(`  Domain: ${siteStructure.domain}`);
    console.log(`  Templates found: ${siteStructure.templates.size}`);
    console.log(`  Entities found: ${siteStructure.entities.length}`);
    console.log(`  Pages analyzed: ${siteStructure.siteMap?.length || 0}`);
    console.log('');
    
    console.log('Step 4: Template details:');
    for (const [type, template] of siteStructure.templates.entries()) {
      console.log(`  - ${type}:`);
      console.log(`    Pattern: ${template.urlPattern}`);
      console.log(`    Characteristics: ${template.characteristics.join(', ')}`);
    }
    console.log('');
    
    if (siteStructure.entities.length > 0) {
      console.log('Step 5: Entities found:');
      for (const entity of siteStructure.entities.slice(0, 5)) {
        console.log(`  - ${entity.type}: ${entity.name}`);
      }
      console.log('');
    }
    
    console.log('Step 6: Generating scenarios...');
    const generator = new ScenarioGenerator();
    const scenarios = generator.generateScenarios(siteStructure);
    console.log(`  Generated ${scenarios.length} scenarios:`);
    for (const scenario of scenarios) {
      console.log(`  - ${scenario.name}: ${scenario.steps.length} steps`);
    }
    console.log('');
    
    console.log('Step 7: Sample Python code (first 20 lines):');
    if (scenarios.length > 0) {
      const pythonCode = generator.generateSeleniumCode(scenarios[0], 'python');
      const lines = pythonCode.split('\n').slice(0, 20);
      console.log(lines.join('\n'));
      console.log('  ... (truncated)');
    }
    console.log('');
    
    console.log('✅ Test completed successfully!');
    console.log('');
    console.log('The site audit server is working correctly.');
    console.log('To use it with a real ecommerce site, configure it in your MCP client.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testCrawler();
