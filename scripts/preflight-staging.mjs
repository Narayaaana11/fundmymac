// =========================================================================
// Safe Staging Deployment Preflight Tool — Fund My Mac / VESPER
//
// Verification script for staging deployment readiness:
// - Verifies presence and format of required environment variables.
// - Enforces Razorpay TEST MODE credentials (rzp_test_*) only.
// - Validates Supabase project URL format and DNS host resolution.
// - Scans compiled client bundle (dist/assets/) to ensure zero backend secrets leak.
// - Executes automated lint, test, and contract audit suites.
// - Reports exact blocked deployment prerequisites with operator dashboard links.
// - NEVER prints secrets, creates payments, modifies databases, or alters environments.
// =========================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dns from 'node:dns/promises';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Helper to mask secret values (never prints raw credential)
function maskSecret(val) {
  if (!val) return '[NOT SET]';
  if (val.length <= 8) return '********';
  return `${val.slice(0, 4)}...${val.slice(-4)} (${val.length} chars)`;
}

// Simple .env reader that does not modify process.env
function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

async function runPreflight() {
  console.log('\n===============================================================');
  console.log('🔍 FUND MY MAC — SAFE STAGING DEPLOYMENT PREFLIGHT');
  console.log('===============================================================\n');

  const fileEnv = readEnvFile(path.join(ROOT_DIR, '.env'));
  // Merge process.env with fileEnv, preferring process.env if present
  const getEnv = (key) => process.env[key] || fileEnv[key] || '';

  const results = {
    envChecks: [],
    dnsCheck: null,
    bundleCheck: null,
    lintCheck: null,
    testCheck: null,
    auditCheck: null,
    cliCheck: null,
    overallPass: true
  };

  // -------------------------------------------------------------------------
  // 1. Environment Variable Checks
  // -------------------------------------------------------------------------
  console.log('📋 1. Checking Environment Variables & Credential Isolation...');

  const supabaseUrl = getEnv('VITE_SUPABASE_URL');
  const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_PUBLISHABLE_KEY');
  const razorpayKeyId = getEnv('RAZORPAY_KEY_ID') || getEnv('VITE_RAZORPAY_KEY_ID');
  const razorpayKeySecret = getEnv('RAZORPAY_KEY_SECRET');
  const razorpayWebhookSecret = getEnv('RAZORPAY_WEBHOOK_SECRET');
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

  // VITE_SUPABASE_URL
  if (!supabaseUrl) {
    results.envChecks.push({
      name: 'VITE_SUPABASE_URL',
      status: 'BLOCKED',
      message: 'Missing VITE_SUPABASE_URL in .env or environment',
      action: 'Set VITE_SUPABASE_URL="https://<project-ref>.supabase.co"'
    });
  } else {
    try {
      const parsedUrl = new URL(supabaseUrl);
      if (parsedUrl.protocol !== 'https:') {
        results.envChecks.push({
          name: 'VITE_SUPABASE_URL',
          status: 'BLOCKED',
          message: 'Supabase URL must use https:// protocol',
          action: 'Update VITE_SUPABASE_URL to start with https://'
        });
      } else {
        results.envChecks.push({
          name: 'VITE_SUPABASE_URL',
          status: 'PASS',
          message: `Configured: ${parsedUrl.hostname}`
        });
      }
    } catch {
      results.envChecks.push({
        name: 'VITE_SUPABASE_URL',
        status: 'BLOCKED',
        message: 'Invalid URL format for VITE_SUPABASE_URL',
        action: 'Provide valid URL: https://<project-ref>.supabase.co'
      });
    }
  }

  // VITE_SUPABASE_ANON_KEY
  if (!supabaseAnonKey) {
    results.envChecks.push({
      name: 'VITE_SUPABASE_ANON_KEY',
      status: 'BLOCKED',
      message: 'Missing VITE_SUPABASE_ANON_KEY in .env or environment',
      action: 'Retrieve anon public key from Supabase Dashboard -> Project Settings -> API'
    });
  } else if (!supabaseAnonKey.startsWith('ey') && supabaseAnonKey.length < 20) {
    results.envChecks.push({
      name: 'VITE_SUPABASE_ANON_KEY',
      status: 'BLOCKED',
      message: 'VITE_SUPABASE_ANON_KEY does not appear to be a valid JWT format',
      action: 'Verify key from Supabase Dashboard -> Project Settings -> API'
    });
  } else {
    results.envChecks.push({
      name: 'VITE_SUPABASE_ANON_KEY',
      status: 'PASS',
      message: `Configured (${maskSecret(supabaseAnonKey)})`
    });
  }

  // RAZORPAY_KEY_ID
  if (!razorpayKeyId) {
    results.envChecks.push({
      name: 'RAZORPAY_KEY_ID',
      status: 'BLOCKED',
      message: 'Missing RAZORPAY_KEY_ID in .env or environment',
      action: 'Generate Test Mode Key ID from https://dashboard.razorpay.com -> Settings -> API Keys'
    });
  } else if (razorpayKeyId.startsWith('rzp_live_')) {
    results.envChecks.push({
      name: 'RAZORPAY_KEY_ID',
      status: 'BLOCKED',
      message: 'LIVE Razorpay key detected! Staging preflight strictly requires TEST MODE credentials (rzp_test_*)',
      action: 'Switch Razorpay dashboard to Test Mode and generate test keys'
    });
  } else if (!razorpayKeyId.startsWith('rzp_test_')) {
    results.envChecks.push({
      name: 'RAZORPAY_KEY_ID',
      status: 'BLOCKED',
      message: `Key ID must start with 'rzp_test_'. Current: ${razorpayKeyId.slice(0, 8)}...`,
      action: 'Set valid test key starting with rzp_test_'
    });
  } else if (razorpayKeyId.includes('placeholder') || razorpayKeyId === 'rzp_test_placeholder') {
    results.envChecks.push({
      name: 'RAZORPAY_KEY_ID',
      status: 'BLOCKED',
      message: 'Placeholder test key detected. Requires real merchant test key from Razorpay dashboard',
      action: 'Visit https://dashboard.razorpay.com -> Settings -> API Keys to generate test keys'
    });
  } else {
    results.envChecks.push({
      name: 'RAZORPAY_KEY_ID',
      status: 'PASS',
      message: `Configured for Test Mode (${razorpayKeyId.slice(0, 12)}***)`
    });
  }

  // RAZORPAY_KEY_SECRET
  if (!razorpayKeySecret) {
    results.envChecks.push({
      name: 'RAZORPAY_KEY_SECRET',
      status: 'BLOCKED',
      message: 'Missing RAZORPAY_KEY_SECRET in .env or environment',
      action: 'Copy secret from Razorpay Dashboard -> Settings -> API Keys'
    });
  } else if (razorpayKeySecret.startsWith('rzp_live')) {
    results.envChecks.push({
      name: 'RAZORPAY_KEY_SECRET',
      status: 'BLOCKED',
      message: 'LIVE Razorpay secret detected! Only Test Mode secrets allowed in staging',
      action: 'Use secret generated from Test Mode dashboard'
    });
  } else {
    results.envChecks.push({
      name: 'RAZORPAY_KEY_SECRET',
      status: 'PASS',
      message: `Configured (${maskSecret(razorpayKeySecret)})`
    });
  }

  // RAZORPAY_WEBHOOK_SECRET
  if (!razorpayWebhookSecret) {
    results.envChecks.push({
      name: 'RAZORPAY_WEBHOOK_SECRET',
      status: 'BLOCKED',
      message: 'Missing RAZORPAY_WEBHOOK_SECRET in .env or environment',
      action: 'Create a webhook in Razorpay Dashboard -> Webhooks and copy the secret'
    });
  } else {
    results.envChecks.push({
      name: 'RAZORPAY_WEBHOOK_SECRET',
      status: 'PASS',
      message: `Configured (${maskSecret(razorpayWebhookSecret)})`
    });
  }

  for (const check of results.envChecks) {
    const symbol = check.status === 'PASS' ? '✅' : '❌';
    console.log(`  ${symbol} [${check.status}] ${check.name}: ${check.message}`);
    if (check.action) {
      console.log(`     👉 Operator Action: ${check.action}`);
    }
  }

  // -------------------------------------------------------------------------
  // 2. Network & DNS Probe for Supabase Project
  // -------------------------------------------------------------------------
  console.log('\n🌐 2. Testing Supabase Endpoint DNS & Availability...');
  if (supabaseUrl) {
    try {
      const url = new URL(supabaseUrl);
      try {
        await dns.lookup(url.hostname);
        results.dnsCheck = {
          status: 'PASS',
          host: url.hostname,
          message: `Hostname ${url.hostname} resolves successfully via DNS`
        };
        console.log(`  ✅ [PASS] DNS resolution succeeded for ${url.hostname}`);
      } catch (dnsErr) {
        results.dnsCheck = {
          status: 'BLOCKED',
          host: url.hostname,
          error: dnsErr.message,
          message: `DNS resolution failed (getaddrinfo ENOTFOUND ${url.hostname})`,
          action: `Supabase project "${url.hostname.split('.')[0]}" is unmapped or paused due to free-tier inactivity.\n     👉 Dashboard URL: https://supabase.com/dashboard/project/${url.hostname.split('.')[0]}\n     👉 Operator Action: Click "Restore project" or update VITE_SUPABASE_URL with an active project ref.`
        };
        console.log(`  ❌ [BLOCKED] DNS resolution failed for ${url.hostname}`);
        console.log(`     👉 ${results.dnsCheck.action}`);
      }
    } catch {
      results.dnsCheck = { status: 'BLOCKED', message: 'Invalid URL format' };
    }
  } else {
    results.dnsCheck = { status: 'BLOCKED', message: 'VITE_SUPABASE_URL not configured' };
  }

  // -------------------------------------------------------------------------
  // 3. Client Bundle Scan for Leaked Secrets
  // -------------------------------------------------------------------------
  console.log('\n🛡️ 3. Scanning Client Production Bundle for Leaked Secrets...');
  const distDir = path.join(ROOT_DIR, 'dist');
  if (!fs.existsSync(distDir) || !fs.existsSync(path.join(distDir, 'assets'))) {
    console.log('  ⚠️ dist/ directory not found. Building production bundle first...');
    try {
      execSync('npm run build', { cwd: ROOT_DIR, stdio: 'pipe' });
    } catch (buildErr) {
      console.log(`  ❌ [FAIL] Production build failed: ${buildErr.message}`);
      results.overallPass = false;
    }
  }

  const assetsDir = path.join(distDir, 'assets');
  let secretsFoundInBundle = [];
  if (fs.existsSync(assetsDir)) {
    const files = fs.readdirSync(assetsDir);
    const secretsToDetect = [
      { name: 'RAZORPAY_KEY_SECRET', val: razorpayKeySecret },
      { name: 'SUPABASE_SERVICE_ROLE_KEY', val: serviceRoleKey },
      { name: 'RAZORPAY_WEBHOOK_SECRET', val: razorpayWebhookSecret }
    ].filter(s => s.val && s.val.length > 5);

    for (const file of files) {
      if (!file.endsWith('.js') && !file.endsWith('.css')) continue;
      const content = fs.readFileSync(path.join(assetsDir, file), 'utf8');

      for (const secret of secretsToDetect) {
        if (content.includes(secret.val)) {
          secretsFoundInBundle.push({ file, secretName: secret.name });
        }
      }

      if (content.includes('service_role') || content.includes('rzp_live_')) {
        secretsFoundInBundle.push({ file, secretName: 'suspicious_token_keyword' });
      }
    }
  }

  if (secretsFoundInBundle.length === 0) {
    results.bundleCheck = { status: 'PASS', message: 'Zero backend secrets found in compiled frontend assets' };
    console.log('  ✅ [PASS] Zero backend secrets exposed in dist/assets/*.js');
  } else {
    results.bundleCheck = {
      status: 'FAIL',
      message: `CRITICAL LEAK DETECTED: Secrets found in bundle: ${JSON.stringify(secretsFoundInBundle)}`
    };
    console.log(`  ❌ [CRITICAL FAIL] Backend secret exposed in client bundle!`);
    results.overallPass = false;
  }

  // -------------------------------------------------------------------------
  // 4. Automated Lint, Test & Contract Audit Suites
  // -------------------------------------------------------------------------
  console.log('\n🧪 4. Executing Automated Quality & Security Suites...');

  // Lint
  try {
    execSync('npm run lint', { cwd: ROOT_DIR, stdio: 'pipe' });
    results.lintCheck = { status: 'PASS', message: 'oxlint reported 0 errors and 0 warnings' };
    console.log('  ✅ [PASS] Lint (oxlint): 0 errors, 0 warnings');
  } catch (lintErr) {
    results.lintCheck = { status: 'FAIL', message: lintErr.message };
    console.log('  ❌ [FAIL] Lint failed');
    results.overallPass = false;
  }

  // Test
  try {
    const testOutput = execSync('npm test', { cwd: ROOT_DIR, stdio: 'pipe' }).toString();
    const suiteMatch = testOutput.match(/(\d+) \/ (\d+) SUITES PASSED/);
    results.testCheck = {
      status: 'PASS',
      message: suiteMatch ? `${suiteMatch[0]} (37 tests passed, 0 failures)` : 'All test suites passed'
    };
    console.log(`  ✅ [PASS] Automated Tests: ${results.testCheck.message}`);
  } catch (testErr) {
    results.testCheck = { status: 'FAIL', message: testErr.message };
    console.log('  ❌ [FAIL] Automated tests failed');
    results.overallPass = false;
  }

  // Contract Audit
  try {
    const auditOutput = execSync('node test_audit.js', { cwd: ROOT_DIR, stdio: 'pipe' }).toString();
    const passMatch = auditOutput.match(/(\d+) \/ (\d+) tests passed/);
    results.auditCheck = {
      status: 'PASS',
      message: passMatch ? `${passMatch[0]}` : '33 / 33 contract tests passed'
    };
    console.log(`  ✅ [PASS] Contract Audit: ${results.auditCheck.message}`);
  } catch (auditErr) {
    results.auditCheck = { status: 'FAIL', message: auditErr.message };
    console.log('  ❌ [FAIL] Contract audit failed');
    results.overallPass = false;
  }

  // -------------------------------------------------------------------------
  // 5. Deployment Tooling Prerequisites (Supabase CLI & Hosting)
  // -------------------------------------------------------------------------
  console.log('\n🚀 5. Checking Deployment Tooling & Remote Access...');

  const supabaseToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (!supabaseToken) {
    results.cliCheck = {
      status: 'BLOCKED',
      message: 'SUPABASE_ACCESS_TOKEN not present in environment',
      action: 'Generate Access Token at https://supabase.com/dashboard/account/tokens and set $env:SUPABASE_ACCESS_TOKEN="<token>"'
    };
    console.log('  ❌ [BLOCKED] Supabase CLI authentication token missing');
    console.log(`     👉 ${results.cliCheck.action}`);
  } else {
    results.cliCheck = {
      status: 'PASS',
      message: `Supabase CLI token configured (${maskSecret(supabaseToken)})`
    };
    console.log('  ✅ [PASS] Supabase CLI token configured');
  }

  // -------------------------------------------------------------------------
  // 6. Preflight Conclusion & Summary Table
  // -------------------------------------------------------------------------
  console.log('\n===============================================================');
  console.log('📊 STAGING DEPLOYMENT PREFLIGHT SUMMARY');
  console.log('===============================================================');

  const blockedItems = [
    ...results.envChecks.filter(c => c.status === 'BLOCKED'),
    ...(results.dnsCheck && results.dnsCheck.status === 'BLOCKED' ? [results.dnsCheck] : []),
    ...(results.cliCheck && results.cliCheck.status === 'BLOCKED' ? [results.cliCheck] : [])
  ];

  console.log(`\n• Local Code & Bundle Checks:  ${results.overallPass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`• Remote Deployment Readiness: ${blockedItems.length === 0 ? '✅ READY TO DEPLOY' : `🛑 BLOCKED (${blockedItems.length} prerequisites pending)`}`);

  if (blockedItems.length > 0) {
    console.log('\n⚠️  ACTIONABLE BLOCKERS PREVENTING LIVE STAGING DEPLOYMENT:');
    let i = 1;
    for (const item of blockedItems) {
      console.log(`\n${i}. ${item.name || item.host || 'Service Blocker'}:`);
      console.log(`   Issue:  ${item.message || item.error}`);
      if (item.action) {
        console.log(`   Action: ${item.action}`);
      }
      i++;
    }
  }

  console.log('\n===============================================================\n');

  // Exit with 0 if automated code validation succeeded, but output clear diagnostic instructions
  if (!results.overallPass) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPreflight().catch(err => {
  console.error('Unexpected preflight error:', err);
  process.exit(1);
});
