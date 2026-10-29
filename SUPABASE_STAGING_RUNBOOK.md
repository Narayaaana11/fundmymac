# FUND MY MAC — SUPABASE STAGING RUNBOOK

**Target Application:** Fund My Mac / VESPER Campaign  
**Scope:** Staging Environment Creation, Database Initialization, Edge Functions Deployment, Razorpay Test Mode Verification, and Disaster Recovery  
**Document Classification:** Production Safety & Staging Operations Runbook

---

## 1. Prerequisites

Before starting staging initialization, ensure you have:
1. **Node.js:** v20+ or v22+ (`node --version`).
2. **Supabase CLI:** Installed and accessible via `npx supabase` (tested with v2.122.0).
3. **Supabase Account Access:** An active account on [https://supabase.com](https://supabase.com).
4. **Supabase Personal Access Token:** Generated via [Supabase Dashboard -> Account -> Access Tokens](https://supabase.com/dashboard/account/tokens).
5. **Razorpay Test Account:** Key ID (`rzp_test_...`), Key Secret, and Webhook Secret from [Razorpay Dashboard](https://dashboard.razorpay.com/) (Settings -> API Keys & Webhooks).

---

## 2. Creating a Separate Staging Project via Supabase Dashboard

To ensure production (`lavydeusonwqjrlhtqzv`) is never touched during testing, create a dedicated staging project:

1. Navigate to **[https://supabase.com/dashboard/projects](https://supabase.com/dashboard/projects)**.
2. Click **New project** (green button, top right).
3. Fill in project details:
   - **Organization:** Select your existing organization.
   - **Name:** `fundmymac-staging`
   - **Database Password:** Click **Generate a password** and copy it into your password manager.
   - **Region:** Select the same region as your production project (e.g., `ap-south-1` Mumbai) for low latency.
   - **Pricing Plan:** Select **Free Tier** (or your preferred tier).
4. Click **Create new project**.
5. Wait ~2 minutes for project provisioning to complete.
6. Retrieve the **Project Reference ID**:
   - Go to **Project Settings** (gear icon) -> **General**.
   - Copy the 20-character string under **Reference ID** (e.g. `abcdefghijklmnopqrst`).
   - **CRITICAL:** Confirm this reference is **NOT** `lavydeusonwqjrlhtqzv`.

---

## 3. Strict Preflight Guard & Reference Verification

Every script or manual CLI session must verify that the target project is staging, aborting immediately if pointed at production.

### PowerShell Preflight Check
```powershell
# Set your staging project reference ID
$STAGING_PROJECT_REF = "YOUR_STAGING_PROJECT_REF_HERE"

# Enforce Production Safety Guard
if (-not $STAGING_PROJECT_REF -or $STAGING_PROJECT_REF -eq "YOUR_STAGING_PROJECT_REF_HERE") {
    Write-Error "ABORT: You must set `$STAGING_PROJECT_REF to your actual 20-character staging project reference."
    exit 1
}

if ($STAGING_PROJECT_REF -eq "lavydeusonwqjrlhtqzv") {
    Write-Error "CRITICAL SECURITY HALT: Target reference matches PRODUCTION (lavydeusonwqjrlhtqzv)! Refusing to execute."
    exit 1
}

Write-Host "✅ Target Project Verified: $STAGING_PROJECT_REF (STAGING)" -ForegroundColor Green
```

### Bash / Zsh Preflight Check
```bash
export STAGING_PROJECT_REF="YOUR_STAGING_PROJECT_REF_HERE"

if [ -z "$STAGING_PROJECT_REF" ] || [ "$STAGING_PROJECT_REF" = "YOUR_STAGING_PROJECT_REF_HERE" ]; then
    echo "ERROR: Set STAGING_PROJECT_REF to your staging project reference."
    exit 1
fi

if [ "$STAGING_PROJECT_REF" = "lavydeusonwqjrlhtqzv" ]; then
    echo "CRITICAL SECURITY HALT: Target reference matches PRODUCTION (lavydeusonwqjrlhtqzv)! Aborting."
    exit 1
fi

echo "✅ Target Project Verified: $STAGING_PROJECT_REF (STAGING)"
```

---

## 4. Secure CLI Authentication

Authenticate without committing tokens or printing secrets to terminal logs:

### PowerShell
```powershell
# Read token securely into session environment (not saved to disk)
$secureToken = Read-Host -Prompt "Enter Supabase Personal Access Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
$env:SUPABASE_ACCESS_TOKEN = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

# Link CLI directly to the staging project
npx supabase link --project-ref $STAGING_PROJECT_REF
```

### Bash / macOS / Linux
```bash
read -sp "Enter Supabase Personal Access Token: " SUPABASE_ACCESS_TOKEN
export SUPABASE_ACCESS_TOKEN

npx supabase link --project-ref $STAGING_PROJECT_REF
```

---

## 5. Applying Migrations via Supported Supabase CLI Workflow

Once linked to the staging project:

### Step 5.1: Check Remote Migration Status
```powershell
npx supabase migration list
```
*Expected output on a fresh staging project:*
Shows the three local migrations pending (`20261029010000`, `20261029020000`, `20261029030000`) with remote status empty.

### Step 5.2: Apply Migrations
```powershell
npx supabase db push
```
The Supabase CLI connects to the linked staging database and executes the repaired migrations in canonical timestamp order:
1. `20261029010000_secure_fundmymac_schema.sql` (Creates extensions, tables, seed inventory, views, RLS policies, functions, realtime publication).
2. `20261029020000_razorpay_integration.sql` (Adds INR paise columns, INR canonical prices, Razorpay fields, function security definers, least-privilege permissions).
3. `20261029030000_production_readiness_hardening.sql` (Adds refunded status, expired-reservation sweep in atomic reservation, refund workflow, operator reconciliation).

### Step 5.3: Confirm CLI Migration History
```powershell
npx supabase migration list
```
*Expected output:* All three migrations marked as applied remotely.

---

## 6. Read-Only Post-Deployment SQL Verification

Execute this read-only audit query in the Staging Supabase Dashboard SQL Editor (`https://supabase.com/dashboard/project/<staging-ref>/sql/new`) to verify all objects:

```sql
-- =========================================================================
-- Fund My Mac: Post-Deployment Schema & Security Audit (Read-Only)
-- =========================================================================

-- 1. Verify required tables and views in public schema
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
-- EXPECTED:
-- brand_spots          | BASE TABLE
-- payment_transactions | BASE TABLE
-- public_sponsors_wall | VIEW
-- site_stats           | BASE TABLE
-- sponsorship_orders   | BASE TABLE

-- 2. Verify all 20 canonical brand spots are seeded with correct prices
SELECT count(*) AS total_spots,
       count(*) FILTER (WHERE status = 'available') AS available_spots,
       min(price_inr_paise) AS min_inr_paise,
       max(price_inr_paise) AS max_inr_paise,
       min(price_usd_cents) AS min_usd_cents,
       max(price_usd_cents) AS max_usd_cents
FROM public.brand_spots;
-- EXPECTED:
-- total_spots = 20, available_spots = 20
-- min_inr_paise = 800000 (₹8,000), max_inr_paise = 4200000 (₹42,000)
-- min_usd_cents = 9900 ($99), max_usd_cents = 50000 ($500)

-- 3. Verify single-row site_stats initialization
SELECT id, views, spots_sold, total_raised_inr_paise, total_raised_usd_cents, total_raised_eur_cents 
FROM public.site_stats 
WHERE id = 1;
-- EXPECTED: id = 1, views >= 0, spots_sold = 0, total_raised_inr_paise = 0

-- 4. Verify RLS policies are active on all public tables
SELECT tablename, policyname, roles, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
-- EXPECTED:
-- brand_spots          | Public read brand_spots                      | {anon,authenticated} | SELECT
-- payment_transactions | Service role full access on payment_trans... | {service_role}       | ALL
-- site_stats           | Public read site_stats                       | {anon,authenticated} | SELECT
-- sponsorship_orders   | Service role full access on sponsorship_...  | {service_role}       | ALL

-- 5. Verify function execution boundaries (Least-Privilege)
SELECT 
    p.proname,
    has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute,
    has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role_can_execute,
    p.prosecdef AS is_security_definer,
    p.proconfig AS search_path_config
FROM pg_proc p
WHERE p.pronamespace = 'public'::regnamespace
  AND p.proname IN (
    'atomic_reserve_spot',
    'release_expired_reservations',
    'confirm_paid_order',
    'process_order_refund',
    'reconcile_unclaimed_payment',
    'record_real_pageview'
  )
ORDER BY p.proname;
-- EXPECTED:
-- atomic_reserve_spot          | false | true | true | {search_path=public}
-- confirm_paid_order           | false | true | true | {search_path=public}
-- process_order_refund         | false | true | true | {search_path=public}
-- reconcile_unclaimed_payment  | false | true | true | {search_path=public}
-- record_real_pageview         | true  | true | true | {search_path=public}
-- release_expired_reservations | false | true | true | {search_path=public}

-- 6. Verify Realtime Publication inclusion
SELECT pubname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' AND tablename IN ('brand_spots', 'site_stats');
-- EXPECTED: 2 rows (brand_spots, site_stats)

-- 7. Verify CLI migration history
SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;
-- EXPECTED: 3 rows (20261029010000, 20261029020000, 20261029030000)
```

---

## 7. Edge Function Deployment & Secret Configuration

Deploy the serverless Edge Functions and inject Razorpay Test Mode credentials without exposing them in code:

```powershell
# 1. Deploy the 3 Edge Functions to staging
npx supabase functions deploy create-razorpay-order --project-ref $STAGING_PROJECT_REF
npx supabase functions deploy verify-razorpay-payment --project-ref $STAGING_PROJECT_REF
npx supabase functions deploy razorpay-webhook --project-ref $STAGING_PROJECT_REF

# 2. Inject Edge Function secrets securely
# Prompt for secrets so they are not stored in shell history
$rzpKeyId = Read-Host -Prompt "Enter Razorpay TEST Key ID (rzp_test_...)"
$rzpKeySecret = Read-Host -Prompt "Enter Razorpay TEST Key Secret" -AsSecureString
$rzpWebhookSecret = Read-Host -Prompt "Enter Razorpay Webhook Secret" -AsSecureString

$BSTR_Secret = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($rzpKeySecret)
$plainKeySecret = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR_Secret)

$BSTR_Webhook = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($rzpWebhookSecret)
$plainWebhookSecret = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR_Webhook)

npx supabase secrets set --project-ref $STAGING_PROJECT_REF `
  ENVIRONMENT="staging" `
  RAZORPAY_KEY_ID="$rzpKeyId" `
  RAZORPAY_KEY_SECRET="$plainKeySecret" `
  RAZORPAY_WEBHOOK_SECRET="$plainWebhookSecret"
```

---

## 8. Razorpay Test Mode Webhook Configuration

1. Open [Razorpay Dashboard](https://dashboard.razorpay.com/) and verify **TEST MODE** badge is active.
2. Go to **Settings** -> **Webhooks** -> **Add New Webhook**.
3. **Webhook URL:** `https://<staging-project-ref>.supabase.co/functions/v1/razorpay-webhook`
4. **Secret:** Paste the exact webhook secret configured in Step 7.
5. **Active Events:**
   - `order.paid`
   - `payment.captured`
   - `payment.failed`
6. Click **Save Webhook**.

---

## 9. Safe End-to-End Staging Verification Test

1. **Pageview Increment:**
   - Open staging frontend URL.
   - Verify banner shows `20 Available` spots.
   - Network tab shows POST `/rest/v1/rpc/record_real_pageview` returning `200` and incrementing count.
2. **Checkout & Spot Lock:**
   - Select Spot #4 (Upper Left Mini-Strip, ₹8,500).
   - Enter sponsor name `Acme Staging Labs`, email `test@acmestaging.internal`, and URL `https://acmestaging.internal`.
   - Click **Claim Spot**.
   - Verify `create-razorpay-order` returns HTTP 200 with Razorpay order ID.
   - Verify spot #4 in database has `status = 'reserved'`.
3. **Test Payment Completion:**
   - In Razorpay modal, select **Netbanking** -> **Success**.
   - Modal closes, celebration confetti triggers, confirmation dialog displays.
   - Database confirms:
     - Spot #4: `status = 'sold'`, `is_sold = true`, `sponsor_name = 'Acme Staging Labs'`.
     - Order: `status = 'paid'`, `amount_cents = 850000`, `currency = 'inr'`.
     - Audit ledger: `payment_transactions` has row with `provider = 'razorpay'`, `status = 'paid'`.
     - `site_stats`: `spots_sold = 1`, `total_raised_inr_paise = 850000`.
4. **Public Sponsors Wall Sanitization:**
   - Check `SELECT * FROM public.public_sponsors_wall;`.
   - Confirm `Acme Staging Labs` is displayed.
   - Confirm **no email address** or private payment metadata is present in any column.

---

## 10. Disaster Recovery & Rollback

### If Migration Fails During `db push`:
Because PostgreSQL wraps migration files in transactions, any error in a migration file aborts and rolls back that file.
1. Check migration state:
   ```powershell
   npx supabase migration list --project-ref $STAGING_PROJECT_REF
   ```
2. Correct the failing SQL in the local migration file.
3. Rerun `npx supabase db push`.

### Resetting Staging to Clean State:
If staging schema needs a complete fresh start (STAGING ONLY):
```sql
-- DANGER: STAGING ONLY. NEVER EXECUTE ON PRODUCTION!
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```
Then re-apply migrations cleanly using `npx supabase db push`.

---

## 11. Production Promotion Gate Checklist

Do **NOT** deploy to production (`lavydeusonwqjrlhtqzv`) until:
- [ ] End-to-end checkout succeeds in staging with Razorpay Test Mode.
- [ ] Webhook signature verification and idempotency verified with mock redelivery.
- [ ] Database backup snapshot taken and confirmed on production project `lavydeusonwqjrlhtqzv`.
- [ ] Production maintenance window approved by repository owner.
- [ ] Live Razorpay credentials ready to be set via `npx supabase secrets set --project-ref lavydeusonwqjrlhtqzv`.
