# FUND MY MAC / VESPER — STAGING DEPLOYMENT RUNBOOK

**Target Environment:** Staging / Pre-Production (Razorpay TEST MODE Only)  
**Repository:** [https://github.com/Narayaaana11/fundmymac](https://github.com/Narayaaana11/fundmymac)  
**Branch:** `feature/secure-production-platform`  
**Compliance Level:** Strict Least-Privilege RLS & PCI-DSS Gateway Isolation  
**Version:** 1.0.0 (Production-Hardened)

---

## 1. Prerequisites Checklist

Before executing any deployment command, ensure you have gathered the following credentials and dashboard access:

| Prerequisite | Dashboard Location | Required Value Format | Status Indicator |
| :--- | :--- | :--- | :--- |
| **1. Active Supabase Project** | [Supabase Dashboard](https://supabase.com/dashboard) | `https://<ref>.supabase.co` | Must resolve via DNS (not paused) |
| **2. Supabase Anon Key** | Project Settings -> API | `sb_publishable_...` or `eyJ...` | Public browser-safe key |
| **3. Supabase Service-Role Key** | Project Settings -> API | `sb_secret_...` or `eyJ...` | Backend secret (Edge Functions only) |
| **4. Supabase Access Token** | [Account Tokens](https://supabase.com/dashboard/account/tokens) | `sbp_...` | For CLI functions deployment |
| **5. Razorpay Test Key ID** | [Razorpay Dashboard](https://dashboard.razorpay.com) (Test Mode) -> Settings -> API Keys | `rzp_test_...` | **Must start with `rzp_test_`** |
| **6. Razorpay Test Key Secret** | Razorpay Dashboard (Test Mode) -> Settings -> API Keys | Secret string | Backend secret for order signing |
| **7. Razorpay Webhook Secret** | Razorpay Dashboard (Test Mode) -> Settings -> Webhooks | Secret string | Used to sign webhook HMAC-SHA256 |
| **8. Frontend Hosting** | Vercel, Netlify, or Cloudflare Pages | Dashboard or CLI | Static production build hosting |

> [!WARNING]
> **NEVER USE LIVE RAZORPAY CREDENTIALS (`rzp_live_*`) IN STAGING.**  
> The backend and preflight script will immediately refuse execution or throw an error if a live key is detected in a non-production or staging context.

---

## 2. Automated Staging Preflight

Before initiating any manual steps, run the automated preflight tool from your terminal:

```bash
npm run preflight:staging
```

### Expected Preflight Output:
- Verifies `.env` and environment variables.
- Enforces `rzp_test_` prefix on Razorpay Key ID.
- Resolves Supabase hostname via DNS.
- Scans `dist/assets/*.js` and ensures **0 backend secrets** are exposed to the browser.
- Executes `oxlint`, 5 test suites (37 unit/integration tests), and 33 contract tests.
- Summarizes any pending operator blockers with direct links.

---

## 3. Phase 1 — Supabase Database Migration

### Step 1.1: Pre-Migration Health Check
In the [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql/new), verify existing database status:

```sql
-- 1. Check existing tables in public schema
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- 2. Check current sponsorship_orders status constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.sponsorship_orders'::regclass AND contype = 'c';
```

### Step 1.2: Execute Schema & Hardening Migrations
Choose **Option A** (Dashboard SQL Editor) or **Option B** (Supabase CLI):

#### Option A: Dashboard SQL Editor (Recommended)
1. Open the [Supabase Dashboard SQL Editor](https://supabase.com/dashboard/project/_/sql/new).
2. Copy the entire contents of [`supabase-setup.sql`](file:///d:/narayana/fundmymac/supabase-setup.sql).
3. Paste into the editor and click **Run**.
4. The script is **100% idempotent and non-destructive**:
   - Uses `CREATE TABLE IF NOT EXISTS`
   - Uses `ON CONFLICT (id) DO UPDATE` for inventory seeds
   - Contains **zero** `DROP TABLE` or `TRUNCATE` statements
   - Revokes function execution from `PUBLIC` and `anon`
   - Grants procedure execution strictly to `service_role`

#### Option B: Supabase CLI Migration Sequence
If using the Supabase CLI with an active access token:

```bash
# Link project
npx supabase link --project-ref <your-project-ref>

# Apply migrations sequentially
npx supabase db push
```

The migrations will execute in canonical order:
1. `supabase/migrations/20261029010000_secure_fundmymac_schema.sql` (Baseline RLS tables & RPCs)
2. `supabase/migrations/20261029020000_razorpay_integration.sql` (Multi-currency & Razorpay fields)
3. `supabase/migrations/20261029030000_production_readiness_hardening.sql` (Refunds, reconciliation, security definers)

### Step 1.3: Post-Migration Verification Queries
Run these validation queries to confirm database integrity:

```sql
-- 1. Verify 20 canonical spots exist with multi-currency pricing
SELECT count(*) AS total_spots, 
       min(price_inr_paise) AS min_inr, 
       max(price_inr_paise) AS max_inr 
FROM public.brand_spots;
-- Expected: total_spots = 20, min_inr = 800000 (₹8,000), max_inr = 4200000 (₹42,000)

-- 2. Verify 'refunded' status is active in check constraint
SELECT count(*) FROM public.sponsorship_orders WHERE status = 'refunded';
-- Expected: returns 0 without SQL error

-- 3. Verify administrative procedures have safe search_path = public
SELECT proname, prosecdef, proconfig 
FROM pg_proc 
WHERE proname IN ('atomic_reserve_spot', 'confirm_paid_order', 'process_order_refund', 'reconcile_unclaimed_payment');
-- Expected: prosecdef = true, proconfig = {search_path=public}

-- 4. Verify anonymous execution is strictly REVOKED (Must return false!)
SELECT has_function_privilege('anon', 'public.atomic_reserve_spot(int, text, int)', 'execute') AS anon_can_reserve,
       has_function_privilege('anon', 'public.confirm_paid_order(text, text, text, int, text, jsonb)', 'execute') AS anon_can_confirm,
       has_function_privilege('anon', 'public.process_order_refund(uuid, text, text)', 'execute') AS anon_can_refund;
-- Expected: false, false, false
```

### Step 1.4: Database Rollback Procedure (Emergency Only)
If migrations need to be rolled back to the previous revision:

```sql
-- Revert refund and reconciliation procedures
DROP FUNCTION IF EXISTS public.process_order_refund(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.reconcile_unclaimed_payment(TEXT, TEXT);

-- Revert check constraint on sponsorship_orders (only if no refunded rows exist)
ALTER TABLE public.sponsorship_orders DROP CONSTRAINT IF EXISTS sponsorship_orders_status_check;
ALTER TABLE public.sponsorship_orders ADD CONSTRAINT sponsorship_orders_status_check 
  CHECK (status IN ('pending', 'reserved', 'paid', 'failed', 'cancelled', 'expired'));
```

---

## 4. Phase 2 — Supabase Edge Functions Deployment

The staging architecture relies on three lightweight, serverless Supabase Edge Functions deployed to your Supabase project.

### Step 2.1: Authenticate Supabase CLI
```bash
# In Windows PowerShell:
$env:SUPABASE_ACCESS_TOKEN = "<your_supabase_personal_access_token>"

# Link to staging project:
npx supabase link --project-ref <your-project-ref>
```

### Step 2.2: Set Edge Function Secrets
Set the required environment variables securely on the Supabase Edge Functions runtime:

```bash
# Set Razorpay Test credentials
npx supabase secrets set RAZORPAY_KEY_ID="rzp_test_..."
npx supabase secrets set RAZORPAY_KEY_SECRET="<your_test_secret>"
npx supabase secrets set RAZORPAY_WEBHOOK_SECRET="<your_webhook_secret>"
npx supabase secrets set ENVIRONMENT="staging"
```

Verify secrets are stored (values will be masked):
```bash
npx supabase secrets list
```

### Step 2.3: Deploy the Three Functions
Deploy each function from the repository root:

```bash
# 1. Order Creation Endpoint
npx supabase functions deploy create-razorpay-order

# 2. Client Payment Verification Endpoint
npx supabase functions deploy verify-razorpay-payment

# 3. Asynchronous Webhook Endpoint
npx supabase functions deploy razorpay-webhook
```

### Step 2.4: Verify Deployed Function Endpoints
Test that each deployed function responds correctly to HTTP requests:

```bash
# 1. Test CORS preflight on create-razorpay-order (Expected: HTTP 200 OK)
curl -i -X OPTIONS https://<your-project-ref>.supabase.co/functions/v1/create-razorpay-order

# 2. Test GET guard on create-razorpay-order (Expected: HTTP 405 Method Not Allowed)
curl -i -X GET https://<your-project-ref>.supabase.co/functions/v1/create-razorpay-order

# 3. Test GET query on verify-razorpay-payment (Expected: HTTP 200 { "found": false, "paid": false })
curl -i -X GET "https://<your-project-ref>.supabase.co/functions/v1/verify-razorpay-payment?session_id=non_existent_test_id"
```

---

## 5. Phase 3 — Razorpay Webhook Configuration

Configure the asynchronous webhook inside the Razorpay Dashboard to ensure payment captures and failures reconcile automatically even if a user closes their browser before redirection.

1. Navigate to [Razorpay Dashboard](https://dashboard.razorpay.com).
2. Ensure top-right toggle is set to **Test Mode**.
3. Go to **Settings** -> **Webhooks** -> **Add New Webhook**.
4. Configure fields:
   - **Webhook URL:** `https://<your-project-ref>.supabase.co/functions/v1/razorpay-webhook`
   - **Secret:** Enter the exact string used for `RAZORPAY_WEBHOOK_SECRET`.
   - **Alert Email:** Your primary operator email.
5. Select **Active Events**:
   - `order.paid`
   - `payment.captured`
   - `payment.failed`
6. Click **Create Webhook**.

---

## 6. Phase 4 — Staging Frontend Deployment

The frontend compiles to a pure static asset bundle (`dist/`) that dynamically routes to Supabase Edge Functions when hosted statically.

### Step 4.1: Build Client Production Bundle
```bash
npm run build
```

Expected output:
```
dist/index.html                   1.97 kB │ gzip:   0.80 kB
dist/assets/index-*.css          40.69 kB │ gzip:   8.17 kB
dist/assets/index-*.js          551.48 kB │ gzip: 156.10 kB
✓ built in ~800ms
```

### Step 4.2: Configure Staging Environment Variables
In your hosting provider dashboard (Vercel, Netlify, Cloudflare Pages), configure these **public client** environment variables:

| Variable Name | Value | Purpose |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | `https://<your-project-ref>.supabase.co` | Supabase API & Edge Functions Base |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_...` | Safe browser anon API key |
| `VITE_RAZORPAY_KEY_ID` | `rzp_test_...` | Public Razorpay Checkout modal key |

> [!NOTE]
> Do **NOT** set `RAZORPAY_KEY_SECRET` or `SUPABASE_SERVICE_ROLE_KEY` in your frontend hosting environment! These belong exclusively in the Supabase Edge Functions runtime.

### Step 4.3: Deploy Staging Application
Deploy the `dist/` directory using your preferred platform:

- **Vercel:** `vercel --prod` (or link GitHub branch `feature/secure-production-platform` to staging environment)
- **Netlify:** `netlify deploy --dir=dist --prod`
- **Cloudflare Pages:** `wrangler pages deploy dist --project-name=fundmymac-staging`

---

## 7. Phase 5 — End-to-End Staging Verification Protocol

Once frontend and Edge Functions are deployed, execute the complete verification journey:

### Test Case 1: Standard Spot Checkout (Happy Path)
1. Open the deployed staging URL in your browser.
2. Ensure the currency selector is set to **₹ INR** (or **$ USD** / **€ EUR**).
3. Click an available spot (e.g. **Spot #4**).
4. Fill in:
   - **Sponsor Name:** `Staging Verification Co.`
   - **Website URL:** `https://example.com`
   - **Billing Email:** `test@example.com`
5. Click **Proceed to Payment**.
6. **Verify:**
   - Edge Function `create-razorpay-order` is invoked.
   - Spot reservation hold is acquired (`status = 'reserved'`).
   - Razorpay Checkout modal opens displaying server-controlled price (₹8,500 for Spot #4).
7. In the Razorpay modal, select **Netbanking** -> **State Bank of India** (or any test bank) -> Click **Success**.
8. **Verify UI Result:**
   - Modal redirects and displays verified success screen.
   - MacBook visualizer immediately reflects the new sponsor.
9. **Verify Database Ledger:**
   ```sql
   SELECT id, order_type, spot_id, amount_cents, currency, status, provider_payment_id 
   FROM public.sponsorship_orders 
   WHERE sponsor_email = 'test@example.com' 
   ORDER BY created_at DESC LIMIT 1;
   -- Expected: status = 'paid', spot_id = 4, provider_payment_id starts with 'pay_'
   ```

### Test Case 2: Asynchronous Webhook Idempotency Check
1. In the Razorpay Dashboard -> Webhooks -> Click your webhook -> **Deliveries**.
2. Select the `order.paid` event from Test Case 1.
3. Click **Resend Webhook**.
4. Check Supabase Edge Function logs (`npx supabase functions logs razorpay-webhook`):
   - Expected: Edge function returns HTTP 200 with `{ status: 'ok' }` without double-counting campaign totals or creating duplicate transaction rows.

### Test Case 3: Failed Payment Inventory Lock Release
1. Open a new checkout on an available spot (e.g. **Spot #5**).
2. In Razorpay modal, select **Failure**.
3. Confirm that:
   - UI reports payment failure gracefully.
   - Spot reservation hold is released within the database.
   - Spot is immediately available for other users to select.

---

## 8. Rollback & Disaster Recovery Procedures

| Scenario | Rollback Action | Expected Time |
| :--- | :--- | :--- |
| **Edge Function Bug** | Re-deploy prior version with `npx supabase functions deploy <function-name>` or modify secret `ENVIRONMENT="maintenance"` | < 2 minutes |
| **Database Lock Stall** | Run `SELECT public.release_expired_reservations();` in Supabase SQL Editor | Instant (< 5 sec) |
| **Accidental Bad Spot State** | Execute `SELECT public.process_order_refund('<order-uuid>', 'Staging test cleanup');` | Instant (< 5 sec) |
| **Frontend Defect** | Roll back static deployment alias in Vercel/Netlify/Cloudflare dashboard | < 1 minute |

---

## 9. Next Steps for Launch

Once this staging runbook has been executed and Test Cases 1–3 pass with live network requests, the platform is ready for production consideration following:
1. Operator sign-off on the 4 legal policies (`support@vesper.ai`, 12-month placement, 48-hour refund, registered entity).
2. Razorpay Live Mode KYC activation and secret provisioning.
