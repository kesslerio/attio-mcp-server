#!/usr/bin/env node
/**
 * Direct skill generation script (bypasses MCP CLI)
 * Generates real skill output from Attio workspace
 */
import { WorkspaceSchemaService } from '../dist/services/skill-generator/WorkspaceSchemaService.js';
import { SchemaFormatterService } from '../dist/services/skill-generator/SchemaFormatterService.js';
import { OutputWriterService } from '../dist/services/skill-generator/OutputWriterService.js';

async function main() {
  try {
    console.log('Fetching schema from Attio workspace...');
    const schemaService = new WorkspaceSchemaService();
    const schema = await schemaService.fetchSchema(
      ['companies', 'people', 'deals'],
      {
        maxOptionsPerAttribute: 20,
        includeArchived: false,
      }
    );

    console.log(`✓ Fetched ${schema.objects.length} objects`);
    console.log(
      `  Companies: ${schema.objects.find((o) => o.objectSlug === 'companies')?.attributes.length || 0} attributes`
    );
    console.log(
      `  People: ${schema.objects.find((o) => o.objectSlug === 'people')?.attributes.length || 0} attributes`
    );
    console.log(
      `  Deals: ${schema.objects.find((o) => o.objectSlug === 'deals')?.attributes.length || 0} attributes`
    );

    console.log('\nFormatting as Claude skill...');
    const formatterService = new SchemaFormatterService();
    const formatted = await formatterService.format(schema, 'skill');

    console.log('✓ Generated skill files:');
    Object.keys(formatted.files).forEach((file) => {
      console.log(`  - ${file}`);
    });

    console.log('\nWriting to disk...');
    const writerService = new OutputWriterService();
    const output = await writerService.write(formatted, {
      objects: ['companies', 'people', 'deals'],
      format: 'skill',
      outputDir: './output',
      zip: false,
      maxOptionsPerAttribute: 20,
      includeArchived: false,
      apiKey: process.env.ATTIO_API_KEY,
    });

    console.log('\n✓ Skill generated successfully!');
    console.log(`  Output: ${output.path}`);
    console.log('  Files:');
    output.files.forEach((file) => console.log(`    - ${file}`));

    // Force exit to prevent TTLCache interval from hanging
    setTimeout(() => {
      process.exit(0);
    }, 100);
  } catch (error) {
    console.error('Generation failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
