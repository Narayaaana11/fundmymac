# FUND MY MAC — SUPABASE STAGING RUNBOOK

**Target Application:** Fund My Mac / VESPER Campaign  
**Scope:** Staging Environment Setup, Database Initialization, Edge Functions Deployment, Razorpay Test Mode Verification, and Disaster Recovery

---

## 1. Prerequisites

Before starting staging initialization, ensure you have:
1. **Node.js:** v20+ or v22+ (`node --version`).
2. **Supabase CLI:** Installed via npx (`npx supabase --version`, tested with v2.122.0).
3. **Supabase Access Token:** Generated in your Supabase Account Settings (`https://supabase.com/dashboard/account/tokens`).
4. **Target Staging Project:** A dedicated Supabase project (e.g. `fundmymac-staging`). Do **NOT** use the production project reference (`lavydeusonwqjrlhtqzv`).
5. **Razorpay Test Account:** Key ID (`rzp_test_...`), Key Secret, and Webhook Secret from the Razorpay Dashboard (Settings -> API Keys & Webhooks).

---

## 2. Verify Target Project Reference

To avoid accidental mutations against production:
```powershell
# Set target staging project reference
$STAGING_PROJECT_REF = "<your-staging-project-ref>"

# Confirm it is NOT the production project
if ($STAGING_PROJECT_REF -eq "lavydeusonwqjrlhtqzv") {
    Write-Error "CRITICAL SAFETY HALT: Refusing to run staging deployment against production reference lavydeusonwqjrlhtqzv!"
    exit 1
}

Write-Host "Target Staging Reference: $STAGING_PROJECT_REF" -ForegroundColor Green
```

---

## 3. Configure CLI Authentication Securely

Never commit access tokens to Git or write them to persistent files.

In PowerShell:
```powershell
# Set session-scoped environment variable (not logged to git or disk)
$env:SUPABASE_ACCESS_TOKEN = Read-Host -Prompt "Enter Supabase Personal Access Token" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($env:SUPABASE_ACCESS_TOKEN)
$env:SUPABASE_ACCESS_TOKEN = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

# Link CLI to the staging project
npx supabase link --project-ref $STAGING_PROJECT_REF
```

---

## 4. Initialize a Disposable or Staging Database

There are two supported workflows for applying the repaired schema:

### Workflow A: Supabase CLI Migration (Recommended)
This workflow tracks migration history automatically in `supabase_migrations.schema_migrations`:

```powershell
# Apply repaired migrations in canonical dependency order
npx supabase db push
```

The CLI applies the three migrations sequentially:
1. `supabase/migrations/20261029010000_secure_fundmymac_schema.sql`
2. `supabase/migrations/20261029020000_razorpay_integration.sql`
3. `supabase/migrations/20261029030000_production_readiness_hardening.sql`

### Workflow B: Supabase Dashboard SQL Editor (Consolidated Fallback)
If direct database connectivity from your network is restricted:
1. Open the Staging Project SQL Editor:
   `https://supabase.com/dashboard/project/<staging-project-ref>/sql/new`
2. Open [`supabase-setup.sql`](file:///d:/narayana/fundmymac/supabase-setup.sql) from the repository.
3. Paste the entire file into the SQL Editor and click **Run**.
4. Synchronize CLI migration tracking table so future `supabase db push` commands recognize the schema:
   ```sql
   CREATE SCHEMA IF NOT EXISTS supabase_migrations;
   CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
       version TEXT PRIMARY KEY,
       statements TEXT[],
       name TEXT
   );
   INSERT INTO supabase_migrations.schema_migrations (version, name)
   VALUES 
       ('20261029010000', 'secure_fundmymac_schema'),
       ('20261029020000', 'razorpay_integration'),
       ('20261029030000', 'production_readiness_hardening')
   ON CONFLICT (version) DO NOTHING;
   ```

---

## 5. Verify Schema Objects & Migration History

Run the following verification queries in the SQL Editor or via `npx supabase inspect db`:

```sql
-- 1. Verify all 4 required tables and 1 view exist in public schema
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
-- Expected: brand_spots, payment_transactions, public_sponsors_wall (VIEW), site_stats, sponsorship_orders

-- 2. Verify all 20 canonical spots exist with INR and USD pricing
SELECT count(*) AS total_spots,
       min(price_inr_paise) AS min_inr_paise,
       max(price_inr_paise) AS max_inr_paise
FROM public.brand_spots;
-- Expected: total_spots = 20, min_inr_paise = 800000 (₹8,000), max_inr_paise = 4200000 (₹42,000)

-- 3. Verify single-row site_stats initialization
SELECT * FROM public.site_stats WHERE id = 1;
-- Expected: id=1, views>=0, spots_sold=0, total_raised_inr_paise=0

-- 4. Verify stored procedures have search_path = public
SELECT proname, prosecdef, proconfig 
FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace 
  AND proname IN (
    'atomic_reserve_spot',
    'release_expired_reservations',
    'confirm_paid_order',
    'process_order_refund',
    'reconcile_unclaimed_payment',
    'record_real_pageview'
  );
-- Expected: prosecdef = true, proconfig contains search_path=public

-- 5. Verify CLI migration history table
SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;
-- Expected: 3 rows with versions 20261029010000, 20261029020000, 20261029030000
```

---

## 6. Configure Edge Function Secrets Securely

Deploy the three serverless functions to staging:

```powershell
# Deploy Edge Functions
npx supabase functions deploy create-razorpay-order --project-ref $STAGING_PROJECT_REF
npx supabase functions deploy verify-razorpay-payment --project-ref $STAGING_PROJECT_REF
npx supabase functions deploy razorpay-webhook --project-ref $STAGING_PROJECT_REF

# Set Edge Function secrets securely (Use TEST mode credentials!)
npx supabase secrets set --project-ref $STAGING_PROJECT_REF `
  ENVIRONMENT="staging" `
  RAZORPAY_KEY_ID="rzp_test_YOUR_KEY_ID" `
  RAZORPAY_KEY_SECRET="YOUR_RAZORPAY_TEST_SECRET" `
  RAZORPAY_WEBHOOK_SECRET="YOUR_WEBHOOK_SECRET"
```

---

## 7. Configure Razorpay Test Mode Webhook

1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com/) in **Test Mode**.
2. Navigate to **Settings** -> **Webhooks** -> **Add New Webhook**.
3. **Webhook URL:** `https://<staging-project-ref>.supabase.co/functions/v1/razorpay-webhook`
4. **Secret:** Set to the exact same string as `RAZORPAY_WEBHOOK_SECRET` above.
5. **Active Events:**
   - `order.paid`
   - `payment.captured`
   - `payment.failed`
6. Click **Save Webhook**.

---

## 8. Safe End-to-End Verification Procedure

Conduct a complete customer checkout journey in Razorpay Test Mode:

### Step 8.1: Test Pageview Analytics
- Open the staging frontend.
- Verify banner displays real analytics: Spot count `20 Available`, `0 Sold`.
- Open network tab and verify POST to `/rest/v1/rpc/record_real_pageview` returns HTTP 200 with incremented view count.

### Step 8.2: Test Spot Reservation
- Select an available spot (e.g. Spot #4, ₹8,500).
- Click **Claim Spot**, fill out the backer name, valid email, and test website URL.
- Click **Proceed to Payment**.
- Verify `create-razorpay-order` returns `200` with Razorpay order ID.
- Verify in database:
  ```sql
  SELECT id, status, reserved_until, reserved_by_session_id 
  FROM public.brand_spots WHERE id = 4;
  ```
  Expected: `status = 'reserved'`, `reserved_until > NOW()`.

### Step 8.3: Complete Test Payment
- In Razorpay Modal, select **Netbanking** or **UPI** -> **Success**.
- Verify modal closes, confetti animation triggers, and confirmation dialog appears.
- Verify database state:
  ```sql
  -- Spot is marked permanently sold
  SELECT id, status, is_sold, sponsor_name FROM public.brand_spots WHERE id = 4;
  -- Expected: status = 'sold', is_sold = true

  -- Order is marked paid
  SELECT id, status, amount_cents, currency, paid_at FROM public.sponsorship_orders WHERE spot_id = 4;
  -- Expected: status = 'paid'

  -- Payment transaction audit record exists
  SELECT provider, event_type, status FROM public.payment_transactions WHERE order_id = (SELECT id FROM public.sponsorship_orders WHERE spot_id = 4);
  -- Expected: provider = 'razorpay', status = 'paid'

  -- Site stats reflect 1 spot sold and ₹8,500 raised
  SELECT spots_sold, total_raised_inr_paise FROM public.site_stats WHERE id = 1;
  -- Expected: spots_sold = 1, total_raised_inr_paise = 850000
  ```

### Step 8.4: Verify Public Sponsors Wall Sanitization
- Query the public sponsors view:
  ```sql
  SELECT * FROM public.public_sponsors_wall;
  ```
- Confirm the new sponsor is listed and that **no private email or secrets appear** in any returned column.

---

## 9. Failure Recovery & Rollback Runbook

If a migration fails or encounters an unhandled exception:

### If using CLI `supabase db push`:
PostgreSQL executes migrations inside transaction blocks by default. A failed statement rolls back the failed file automatically.
1. Inspect CLI error log:
   `npx supabase migration list --project-ref $STAGING_PROJECT_REF`
2. Determine which migration failed.
3. Fix the migration script in source control.
4. Rerun `npx supabase db push`.

### If using SQL Editor:
Always wrap statements in `BEGIN ... COMMIT`:
```sql
BEGIN;
-- Migration statements...
COMMIT;
```
If an error occurs, run:
```sql
ROLLBACK;
```

### Resetting a Disposable Staging Database:
If the staging schema needs a complete fresh start:
```sql
-- DANGER: STAGING ONLY. NEVER RUN AGAINST PRODUCTION!
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```
Then re-apply Workflow A or Workflow B from clean baseline.

---

## 10. Conditions Required Before Production Deployment

Under **no circumstances** should changes be promoted to production (`lavydeusonwqjrlhtqzv`) until:

1. **Staging Parity Verified:** Full end-to-end checkout, payment confirmation, realtime broadcast, and webhook idempotency pass in the staging environment.
2. **Production Backup Verified:** The project owner must enable or verify Supabase database backups for the production instance (`lavydeusonwqjrlhtqzv`) or take a manual schema/data dump.
3. **Owner Approval:** Scheduled migration maintenance window approved by the campaign owner.
4. **Live Razorpay Credentials Ready:** Live Razorpay keys and webhook secret validated with the payment provider.
