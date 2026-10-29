// Verification script for live deployed Vercel site
async function verifyLive() {
  console.log('--- Checking HTML Response ---');
  const htmlRes = await fetch('https://fundmymac.vercel.app');
  console.log('HTML status:', htmlRes.status);
  const html = await htmlRes.text();
  console.log('HTML contains title:', html.includes('<title>Fund My Mac'));
  
  const match = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
  if (!match) {
    console.error('Script bundle not found');
    process.exit(1);
  }
  const jsUrl = 'https://fundmymac.vercel.app' + match[1];
  console.log('Fetching JS bundle:', jsUrl);
  const jsRes = await fetch(jsUrl);
  console.log('JS bundle status:', jsRes.status);
  const js = await jsRes.text();
  
  console.log('\n--- Content & Coming Soon Verifications ---');
  console.log('JS contains "Pricing Coming Soon":', js.includes('Pricing Coming Soon'));
  console.log('JS contains "Join the Waitlist":', js.includes('Join the Waitlist'));
  console.log('JS contains "Coming Soon":', js.includes('Coming Soon'));
  console.log('JS contains "Sponsorships opening soon":', js.includes('Sponsorships opening soon'));
  console.log('JS contains "$500 per space" (must be false):', js.includes('$500 per space'));
  console.log('JS contains service_role secret (must be false):', js.includes('service_role') && js.includes('SUPABASE_SERVICE_ROLE_KEY'));

  console.log('\n--- SPA Rewrite / Direct Navigation Verification ---');
  const directRouteRes = await fetch('https://fundmymac.vercel.app/waitlist');
  console.log('Direct subroute (/waitlist) status:', directRouteRes.status);
  const directHtml = await directRouteRes.text();
  console.log('Direct subroute returns SPA index.html:', directHtml.includes('<div id="root"></div>'));
}

verifyLive().catch(console.error);
