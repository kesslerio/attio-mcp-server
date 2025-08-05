#!/usr/bin/env node

/**
 * CLI script to migrate user.json configuration files
 * Fixes outdated postal code mappings from #219
 */

import { colorize } from '../dist/utils/cli-colors.js';
import {
  detectMigrationNeeds,
  migrateUserConfig,
} from '../dist/utils/config-migration.js';

function showProgress(step, total, message) {
  const percentage = Math.round((step / total) * 100);
  const bar =
    '█'.repeat(Math.floor(percentage / 5)) +
    '░'.repeat(20 - Math.floor(percentage / 5));
  console.log(colorize(`[${bar}] ${percentage}% - ${message}`, 'blue'));
}

function printHeader() {
  console.log(
    colorize('\n🔧 Attio MCP Server - Configuration Migration Tool', 'cyan')
  );
  console.log(colorize('═'.repeat(55), 'cyan'));
  console.log('Fixes postal code mapping issues from GitHub issue #219\n');
}

function printUsage() {
  console.log(colorize('Usage:', 'bold'));
  console.log('  npm run migrate-config          Run migration');
  console.log(
    '  npm run migrate-config -- --dry-run    Check what would be migrated'
  );
  console.log('  npm run migrate-config -- --help       Show this help\n');
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const showHelp = args.includes('--help') || args.includes('-h');

  printHeader();

  if (showHelp) {
    printUsage();
    process.exit(0);
  }

  try {
    // First, detect if migration is needed
    console.log(colorize('🔍 Detecting migration needs...', 'blue'));
    const detection = detectMigrationNeeds();

    if (!detection.exists) {
      console.log(
        colorize('✅ No user.json file found - no migration needed', 'green')
      );
      process.exit(0);
    }

    console.log(
      colorize(`📁 Found user config: ${detection.filePath}`, 'white')
    );

    if (!detection.needsMigration) {
      console.log(
        colorize('✅ User configuration is already up to date!', 'green')
      );
      process.exit(0);
    }

    // Show what needs to be migrated
    console.log(colorize('\n⚠️  Migration needed!', 'yellow'));
    console.log(colorize('Outdated mappings found:', 'yellow'));
    detection.outdatedMappings.forEach((mapping) => {
      console.log(`  • ${mapping}`);
    });

    if (dryRun) {
      console.log(
        colorize('\n🔍 Dry run mode - no changes will be made', 'cyan')
      );

      const result = migrateUserConfig({ dryRun: true });
      if (result.success) {
        console.log(
          colorize('✅ Migration preview completed successfully', 'green')
        );
        console.log(colorize('\nTo apply these changes, run:', 'white'));
        console.log(colorize('  npm run migrate-config', 'cyan'));
      } else {
        console.log(colorize('❌ Migration preview failed:', 'red'));
        console.log(result.message);
      }
      process.exit(0);
    }

    // Confirm with user before proceeding
    console.log(colorize('\n❓ Proceed with migration?', 'yellow'));
    console.log('This will:');
    console.log('  • Create a backup of your current user.json');
    console.log('  • Update postal code mappings to use "postal_code"');
    console.log('  • Validate the migration was successful');

    // For non-interactive environments, proceed automatically
    if (process.env.CI || process.env.ATTIO_AUTO_MIGRATE === 'true') {
      console.log(
        colorize('\n🤖 Auto-proceeding in CI/automated environment', 'cyan')
      );
    } else {
      console.log(
        colorize(
          '\nPress Ctrl+C to cancel, or any key to continue...',
          'yellow'
        )
      );

      // Simple way to wait for user input in Node.js
      await new Promise((resolve) => {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.once('data', () => {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          resolve();
        });
      });
    }

    // Run the migration with progress indicators
    console.log(colorize('\n🚀 Running migration...', 'blue'));
    showProgress(1, 4, 'Creating backup...');
    showProgress(2, 4, 'Applying migration...');
    showProgress(3, 4, 'Validating changes...');
    const result = migrateUserConfig();
    showProgress(4, 4, 'Migration complete!');

    if (result.success) {
      console.log(colorize('✅ Migration completed successfully!', 'green'));
      console.log(result.message);

      if (result.backupPath) {
        console.log(colorize(`💾 Backup saved: ${result.backupPath}`, 'cyan'));
      }

      if (result.changesApplied && result.changesApplied.length > 0) {
        console.log(colorize('\n📝 Changes applied:', 'white'));
        result.changesApplied.forEach((change) => {
          console.log(`  • ${change}`);
        });
      }

      console.log(
        colorize('\n🎉 Your postal code mappings are now fixed!', 'green')
      );
      process.exit(0);
    } else {
      console.log(colorize('❌ Migration failed:', 'red'));
      console.log(result.message);

      if (result.errors && result.errors.length > 0) {
        console.log(colorize('\nErrors:', 'red'));
        result.errors.forEach((error) => {
          console.log(`  • ${error}`);
        });
      }

      if (result.backupPath) {
        console.log(
          colorize(
            `\n💾 Your original config was backed up to: ${result.backupPath}`,
            'cyan'
          )
        );
      }

      process.exit(1);
    }
  } catch (error) {
    console.log(colorize('❌ Unexpected error:', 'red'));
    console.error(error);
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  console.error(colorize('Fatal error:', 'red'), error);
  process.exit(1);
});
