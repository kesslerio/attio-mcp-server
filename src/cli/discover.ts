#!/usr/bin/env node
/**
 * CLI tool for discovering Attio attributes and generating mapping files
 */
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { discoverAttributes } from './commands/attributes.js';
import { generateSkill } from './commands/generate-skill.js';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({ debug: false });

/**
 * Main CLI entrypoint
 */
yargs(hideBin(process.argv))
  .scriptName('attio-discover')
  .usage('$0 <cmd> [args]')
  .command(
    'attributes',
    'Discover Attio attribute mappings',
    (yargs) => {
      return yargs
        .option('object', {
          alias: 'o',
          description:
            'Object type to discover attributes for (e.g., companies, people)',
          type: 'string',
        })
        .option('all', {
          alias: 'a',
          description: 'Discover attributes for all objects',
          type: 'boolean',
          default: false,
        })
        .option('output', {
          alias: 'f',
          description: 'Output file path',
          default: 'configs/runtime/mappings/user.json',
          type: 'string',
        })
        .option('reset', {
          alias: 'r',
          description: 'Reset existing mappings instead of merging',
          type: 'boolean',
          default: false,
        })
        .option('api-key', {
          alias: 'k',
          description: 'Attio API key (defaults to ATTIO_API_KEY env var)',
          type: 'string',
        })
        .conflicts('object', 'all')
        .check((argv) => {
          if (!argv.object && !argv.all) {
            throw new Error('You must specify either --object or --all');
          }
          return true;
        });
    },
    discoverAttributes
  )
  .command(
    'generate-skill',
    'Generate Claude Skill from workspace schema',
    (yargs) => {
      yargs
        .option('object', {
          alias: 'o',
          description: 'Object to generate skill for (e.g., companies, people)',
          type: 'string',
        })
        .option('all', {
          alias: 'a',
          description:
            'Generate for Phase 1 objects (companies, people, deals)',
          type: 'boolean',
          default: false,
        })
        .option('format', {
          alias: 'f',
          description: 'Output format (skill, markdown, json)',
          type: 'string',
          choices: ['skill', 'markdown', 'json'] as const,
          default: 'skill',
        })
        .option('output', {
          description: 'Output directory',
          type: 'string',
          default: './output',
        })
        .option('zip', {
          alias: 'z',
          description: 'Package as ZIP file',
          type: 'boolean',
          default: false,
        })
        .option('max-options', {
          description: 'Max options per attribute (default: 20)',
          type: 'number',
          default: 20,
        })
        .option('include-archived', {
          description: 'Include archived options',
          type: 'boolean',
          default: false,
        })
        .option('api-key', {
          alias: 'k',
          description: 'Attio API key (defaults to ATTIO_API_KEY env var)',
          type: 'string',
        })
        .conflicts('object', 'all')
        .check((argv) => {
          if (!argv.object && !argv.all) {
            throw new Error('You must specify either --object or --all');
          }
          return true;
        });
    },
    generateSkill
  )
  /*
  // These commands will be implemented in future phases
  .command('objects', 'Discover object mappings', (yargs) => {
    // ... object discovery options
  }, discoverObjects)
  .command('lists', 'Discover list mappings', (yargs) => {
    // ... list discovery options
  }, discoverLists)
  .command('all', 'Discover all mappings', (yargs) => {
    // ... options for discovering everything
  }, discoverAll)
  */
  .demandCommand(1, 'You must specify a discovery command')
  .help()
  .alias('help', 'h')
  .epilog('For more information, visit https://github.com/hmk/attio-mcp-server')
  .parse();
