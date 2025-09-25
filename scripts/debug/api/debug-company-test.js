// Quick debug script to see what's happening with company creation
import { execSync } from 'child_process';

try {
  const result = execSync(
    `npm run e2e -- test/e2e/suites/notes-management.e2e.test.ts -t "should create test companies for note testing" --retry=0 2>&1`,
    {
      encoding: 'utf8',
      timeout: 60000,
    }
  );

  // Look for error patterns
  const lines = result.split('\n');
  let foundError = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes('Error executing tool')) {
      console.log('FOUND ERROR:');
      console.log(line);
      // Print next few lines for context
      for (let j = 1; j <= 5 && i + j < lines.length; j++) {
        console.log(lines[i + j]);
      }
      foundError = true;
      break;
    }

    if (line.includes('isError') && line.includes('true')) {
      console.log('FOUND isError=true:');
      console.log(line);
      foundError = true;
    }

    if (line.includes('Response has error flag')) {
      console.log('RESPONSE ERROR:');
      console.log(line);
      foundError = true;
    }
  }

  if (!foundError) {
    console.log('No specific error found in output. Full result:');
    console.log(result);
  }
} catch (error) {
  console.error('Error running test:', error.message);
}
