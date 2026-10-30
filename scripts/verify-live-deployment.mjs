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
  
  console.log('\n--- BrandMyMac Live Auction Verifications ---');
  console.log('JS contains "14-Day Live Auction":', js.includes('14-Day Live Auction'));
  console.log('JS contains "20% Deposit":', js.includes('20% Deposit'));
  console.log('JS contains "THE CORNER TAKEOVER":', js.includes('THE CORNER TAKEOVER'));
  console.log('JS contains "OFFICIAL LEADERBOARD":', js.includes('OFFICIAL LEADERBOARD'));
  console.log('JS contains "Outbid Guarantee":', js.includes('BrandMyMac Guarantee'));
  console.log('JS contains Starting floors:', js.includes('Starting floors from'));
  console.log('JS contains service_role secret (must be false):', js.includes('service_role') && js.includes('SUPABASE_SERVICE_ROLE_KEY'));

  console.log('\n--- SPA Rewrite / Direct Navigation Verification ---');
  const directRouteRes = await fetch('https://fundmymac.vercel.app/leaderboard');
  console.log('Direct subroute (/leaderboard) status:', directRouteRes.status);
  const directHtml = await directRouteRes.text();
  console.log('Direct subroute returns SPA index.html:', directHtml.includes('<div id="root"></div>'));
}

verifyLive().catch(console.error);
