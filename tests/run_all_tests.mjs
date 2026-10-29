// =========================================================================
// Fund My Mac: Master Automated Verification Test Runner
// =========================================================================

import { spawn } from 'node:child_process';

const testFiles = [
  'tests/database_security_rls.test.mjs',
  'tests/payment_checkout.test.mjs',
  'tests/concurrency_reservation.test.mjs',
  'tests/webhook_idempotency.test.mjs',
  'tests/frontend_canonical.test.mjs'
];

console.log('====================================================');
console.log('🚀 FUND MY MAC: MASTER TEST RUNNER');
console.log('====================================================\n');

let failedSuites = 0;
let passedSuites = 0;

async function runTestFile(file) {
  return new Promise((resolveResult) => {
    console.log(`\n▶️ Running test suite: ${file}...`);
    const proc = spawn('node', ['--experimental-strip-types', '--no-warnings', '--test', file], {
      stdio: 'inherit',
      shell: true
    });

    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Passed: ${file}`);
        passedSuites++;
        resolveResult(true);
      } else {
        console.error(`❌ Failed: ${file} (Exit code ${code})`);
        failedSuites++;
        resolveResult(false);
      }
    });
  });
}

async function runAll() {
  for (const file of testFiles) {
    await runTestFile(file);
  }

  console.log('\n====================================================');
  console.log(`📊 MASTER TEST RESULTS: ${passedSuites} / ${testFiles.length} SUITES PASSED`);
  if (failedSuites > 0) {
    console.error(`❌ ${failedSuites} test suites failed.`);
    process.exit(1);
  } else {
    console.log('🎉 ALL AUTOMATED QUALITY & SECURITY SUITES PASSED!');
    console.log('====================================================\n');
  }
}

runAll();
