/**
 * CLI command handler for generating Claude Skills from Attio workspace schema
 *
 * @see Issue #983
 */

import ora from 'ora';
import chalk from 'chalk';
import {
  WorkspaceSchemaService,
  SchemaFormatterService,
  OutputWriterService,
} from '@/services/skill-generator/index.js';
import type { GenerateSkillConfig } from '@/services/skill-generator/types.js';

/**
 * Interface for command arguments
 */
interface GenerateSkillArgs {
  object?: string;
  all?: boolean;
  format?: 'skill' | 'markdown' | 'json';
  output?: string;
  zip?: boolean;
  maxOptions?: number;
  includeArchived?: boolean;
  optionFetchDelay?: number;
  apiKey?: string;
  [key: string]: unknown;
}

/**
 * Phase 1 objects (companies, people, deals)
 */
const PHASE_1_OBJECTS = ['companies', 'people', 'deals'];

/**
 * Command handler for generating skills
 *
 * @param argv - Command arguments from yargs
 */
export async function generateSkill(argv: GenerateSkillArgs): Promise<void> {
  const spinner = ora('Initializing skill generator...').start();

  try {
    // 1. Validate API key
    const apiKey = argv.apiKey || process.env.ATTIO_API_KEY;
    if (!apiKey) {
      spinner.fail(
        'No API key provided. Set ATTIO_API_KEY env var or pass --api-key'
      );
      process.exit(1);
    }

    // 2. Determine objects to process
    let objects: string[];
    if (argv.all) {
      objects = PHASE_1_OBJECTS;
      spinner.text = `Generating skill for ${objects.join(', ')}...`;
    } else {
      objects = [argv.object!];
      spinner.text = `Generating skill for ${argv.object}...`;
    }

    // 3. Warn about non-Phase 1 objects
    const nonPhase1 = objects.filter((obj) => !PHASE_1_OBJECTS.includes(obj));
    if (nonPhase1.length > 0) {
      spinner.warn(
        chalk.yellow(
          `⚠️  Objects ${nonPhase1.join(', ')} are experimental (Phase 1: ${PHASE_1_OBJECTS.join(', ')})`
        )
      );
      spinner.start('Continuing with generation...');
    }

    // 4. Build configuration
    const config: GenerateSkillConfig = {
      objects,
      format: (argv.format as 'skill' | 'markdown' | 'json') || 'skill',
      outputDir: argv.output || './output',
      zip: argv.zip || false,
      maxOptionsPerAttribute: argv.maxOptions || 20,
      includeArchived: argv.includeArchived || false,
      optionFetchDelayMs: argv.optionFetchDelay ?? 100,
      apiKey,
    };

    // 5. Fetch workspace schema
    spinner.text = `Fetching workspace schema for ${objects.length} object(s)...`;
    const schemaService = new WorkspaceSchemaService();
    const schema = await schemaService.fetchSchema(objects, {
      maxOptionsPerAttribute: config.maxOptionsPerAttribute,
      includeArchived: config.includeArchived,
      optionFetchDelayMs: config.optionFetchDelayMs,
    });

    if (schema.objects.length === 0) {
      spinner.fail(
        'No objects could be fetched. Check API key and object names.'
      );
      process.exit(1);
    }

    if (schema.objects.length < objects.length) {
      spinner.warn(
        chalk.yellow(
          `⚠️  Only ${schema.objects.length} of ${objects.length} objects were fetched successfully`
        )
      );
      spinner.start('Continuing with available data...');
    }

    spinner.succeed(
      `Fetched schema for ${chalk.green(schema.objects.length.toString())} object(s)`
    );

    // 6. Format schema
    spinner.start(`Formatting output as ${config.format}...`);
    const formatterService = new SchemaFormatterService();
    const formatted = await formatterService.format(schema, config.format);
    spinner.succeed(`Formatted as ${chalk.cyan(config.format)}`);

    // 7. Write output
    spinner.start('Writing files to disk...');
    const writerService = new OutputWriterService();
    const output = await writerService.write(formatted, config);

    // 8. Success message
    spinner.succeed(chalk.green('✓ Skill generated successfully!\n'));

    process.stdout.write(chalk.cyan('  Output:') + '\n');
    process.stdout.write(chalk.white(`    ${output.path}`) + '\n');
    process.stdout.write('\n');
    process.stdout.write(chalk.cyan('  Files:') + '\n');
    output.files.forEach((file) => {
      process.stdout.write(chalk.white(`    - ${file}`) + '\n');
    });

    if (config.zip) {
      process.stdout.write('\n');
      process.stdout.write(
        chalk.green('  ✓ ZIP package ready for Claude upload!') + '\n'
      );
    }

    // Note: TTLCache uses unref() on its cleanup interval (ttl-cache.ts:38-40)
    // so it won't prevent the process from exiting naturally
  } catch (error: unknown) {
    spinner.fail(
      chalk.red(
        `Generation failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    );
    process.exit(1);
  }
}
