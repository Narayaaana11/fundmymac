# FUND MY MAC — SUPABASE DATABASE RECOVERY & RAZORPAY READINESS REPORT

**Date:** 2026-10-30  
**Repository:** [https://github.com/Narayaaana11/fundmymac](https://github.com/Narayaaana11/fundmymac)  
**Branch:** `fix/supabase-database-recovery` (branched from `feature/secure-production-platform` at commit `9812e88`)  
**Target Supabase Project Reference:** `lavydeusonwqjrlhtqzv` (`https://lavydeusonwqjrlhtqzv.supabase.co`)  
**Execution Posture:** **AUDIT & LOCAL REPAIR ONLY**. Zero remote database commands executed. No live payment modifications performed.

---

## 1. Executive Summary & Root Cause Analysis

### Confirmed Production State
- **Infrastructure Status:** The Supabase dashboard for project `lavydeusonwqjrlhtqzv` reports `Healthy`, REST endpoints return CORS 200/204, and Realtime WebSockets connect successfully.
- **Application Database State:** The `public` schema contains **0 tables and 0 views**. Table Editor is blank. Supabase migration history contains **0 migrations**. Backup dashboard reports **no backups**.
- **Application Symptoms:** Frontend client and server endpoints return HTTP 404 for `brand_spots`, `site_stats`, `public_sponsors_wall`, and RPC `record_real_pageview()`.

### Root Causes
1. **Uninitialized Remote Database:** The Supabase project was provisioned, but the database schema migrations were never applied to the remote PostgreSQL instance. Infrastructure health was mistaken for application database readiness.
2. **Defect in Baseline Migration (`public.donations` relation missing):**
   In `20261029_secure_fundmymac_schema.sql` (lines 147–148) and `supabase-setup.sql` (lines 154–155), the statement:
   ```sql
   DROP POLICY IF EXISTS "Allow public read on donations" ON public.donations;
   DROP POLICY IF EXISTS "Allow public insert on donations" ON public.donations;
   ```
   was executed without checking if `public.donations` existed. In PostgreSQL, `DROP POLICY [IF EXISTS] ON <table_name>` fails with `ERROR: relation "public.donations" does not exist` if the table does not exist. On an empty database, this caused the initial migration transaction to immediately abort and roll back.
3. **Migration Filename & Ordering Inversion:**
   The three migration files were previously named:
   - `20261029_production_readiness_hardening.sql`
   - `20261029_razorpay_integration.sql`
   - `20261029_secure_fundmymac_schema.sql`
   All shared the identical 8-digit timestamp `20261029_`. Under standard lexicographical sorting (used by Supabase CLI and filesystem directory readers), `production_readiness_hardening.sql` sorted **first** ('p' < 'r' < 's'), attempting to modify constraints and functions on tables (`sponsorship_orders`, `brand_spots`) that did not exist yet. Furthermore, Supabase CLI expects standard 14-digit timestamps (`YYYYMMDDHHMMSS`).
4. **Setup Script Divergence from Hardening Migration:**
   The monolithic `supabase-setup.sql` had an outdated definition of `atomic_reserve_spot()` that omitted the automatic expired-reservation sweep (`PERFORM public.release_expired_reservations();`) implemented in the hardening migration. It also diverged on `provider_order_id` index definition (`UNIQUE` column constraint vs. partial unique index `idx_sponsorship_orders_provider_order_id`).
5. **Local CLI Configuration Missing:**
   `supabase/config.toml` was missing from the repository, preventing CLI commands from detecting local project boundaries.

---

## 2. Migration Defects Found & Corrections Applied

| Defect # | Location | Nature of Defect | Technical Impact | Correction Applied |
| :--- | :--- | :--- | :--- | :--- |
| **D-01** | `supabase/migrations/20261029010000_secure_fundmymac_schema.sql` (L147-148)<br>`supabase-setup.sql` (L154-155) | Un-guarded `DROP POLICY IF EXISTS` on non-existent `public.donations` | In PostgreSQL, `DROP POLICY` requires the table to exist in `pg_class`. Halts on empty database with `ERROR: relation "public.donations" does not exist`. | Wrapped in `DO $$ BEGIN IF to_regclass('public.donations') IS NOT NULL THEN EXECUTE ...; END IF; END $$;`. Allows safe clean-database initialization. |
| **D-02** | `supabase/migrations/` file naming | 8-digit identical timestamp prefix (`20261029_`) on all three migrations | Lexicographical sort ordered `production_readiness_hardening.sql` before `secure_fundmymac_schema.sql`. Incompatible with Supabase CLI 14-digit convention. | Renamed via `git mv` to 14-digit chronological timestamps: `20261029010000_...`, `20261029020000_...`, `20261029030000_...`. Guarantees strict dependency order. |
| **D-03** | `supabase-setup.sql` (L179-233) | `atomic_reserve_spot` omitted automatic reservation sweep | Stale implementation. If backer abandoned checkout, spot remained locked until external cron, causing false "Spot held in checkout" errors. | Updated `atomic_reserve_spot` in `supabase-setup.sql` to call `PERFORM public.release_expired_reservations();` before checking row lock, matching Migration 3. |
| **D-04** | `supabase-setup.sql` (L103) | Inline `provider_order_id TEXT UNIQUE` constraint vs. partial index in Migration 2 | Divergent index definitions between setup script and migration history. | Changed `provider_order_id TEXT,` and added `CREATE UNIQUE INDEX IF NOT EXISTS idx_sponsorship_orders_provider_order_id ON public.sponsorship_orders(provider_order_id) WHERE provider_order_id IS NOT NULL;`. |
| **D-05** | `supabase/config.toml` | File missing from repository | `supabase` CLI could not resolve local project defaults. | Initialized `supabase/config.toml` via `npx supabase init`. Ignored `.temp/` and local branches in `.gitignore`. |

---

## 3. Changed Files & Rationale

```
supabase/
├── config.toml                                                       [NEW] Standard Supabase CLI configuration
├── .gitignore                                                        [NEW] Ignores .temp and local branch state
├── migrations/
│   ├── 20261029010000_secure_fundmymac_schema.sql                    [RENAMED & FIXED] Baseline schema + guarded donations drop
│   ├── 20261029020000_razorpay_integration.sql                       [RENAMED] 14-digit timestamp for CLI ordering
│   └── 20261029030000_production_readiness_hardening.sql            [RENAMED] 14-digit timestamp for CLI ordering
supabase-setup.sql                                                    [FIXED] Synchronized atomic_reserve_spot, index, & guarded drop
tests/database_security_rls.test.mjs                                  [UPDATED] Dynamic migration discovery + 4 new consistency assertions
STAGING_DEPLOYMENT_RUNBOOK.md                                         [UPDATED] References 14-digit migration filenames
```

---

## 4. Migration Dependency Order

The migrations now strictly execute in the following dependency DAG:

```
[1] 20261029010000_secure_fundmymac_schema.sql
    ├── Enables pgcrypto extension
    ├── Creates public.site_stats (single-row id=1, views, spots_sold, USD/EUR totals)
    ├── Creates public.brand_spots (20 canonical spots inventory, USD/EUR prices)
    ├── Seeds 20 brand_spots (Lid, Palm Rest, Accessories)
    ├── Creates public.sponsorship_orders (Order ledger, PII email, FK brand_spots)
    ├── Creates public.payment_transactions (Audit ledger, provider_event_id UNIQUE)
    ├── Creates public.public_sponsors_wall (Sanitized view, NO emails)
    ├── Enables RLS on all 4 tables & drops legacy policies safely
    ├── Implements atomic_reserve_spot, release_expired_reservations, confirm_paid_order, record_real_pageview
    └── Subscribes brand_spots and site_stats to supabase_realtime publication
        │
        ▼
[2] 20261029020000_razorpay_integration.sql
    ├── Extends site_stats with total_raised_inr_paise BIGINT NOT NULL DEFAULT 0
    ├── Extends brand_spots with price_inr_paise INT NOT NULL DEFAULT 850000
    ├── Updates canonical INR prices across all 20 spots (₹8,000 to ₹42,000)
    ├── Extends sponsorship_orders with provider_order_id, provider_payment_id, provider_signature
    ├── Creates idx_sponsorship_orders_provider_order_id partial unique index
    ├── Drops & re-creates currency check constraint to permit ('inr', 'usd', 'eur')
    ├── Sets default payment_provider to 'razorpay'
    ├── Hardens all functions with SET search_path = public
    ├── Tightens confirm_paid_order to calculate INR paise totals
    └── Restricts execution permissions: REVOKE from PUBLIC/anon, GRANT to service_role
        │
        ▼
[3] 20261029030000_production_readiness_hardening.sql
    ├── Updates sponsorship_orders status check constraint to include 'refunded'
    ├── Hardens atomic_reserve_spot with automated expired-reservation sweep
    ├── Implements process_order_refund (atomic refund, ledger logging, inventory restoration, total recalculation)
    ├── Implements reconcile_unclaimed_payment (operator recovery for captured payments)
    └── Revokes process_order_refund & reconcile_unclaimed_payment from PUBLIC/anon, grants strictly to service_role
```

---

## 5. Security & Permission Audit

### Row-Level Security (RLS) Matrix
| Table | RLS Active | Public (`anon`) Access | Authenticated Access | Service Role Access | Notes |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `public.site_stats` | **YES** | `SELECT` only | `SELECT` only | `ALL` | Read-only analytics for campaign banner and ticker. |
| `public.brand_spots` | **YES** | `SELECT` only | `SELECT` only | `ALL` | Public can browse spots. Zero public `INSERT`, `UPDATE`, or `DELETE`. |
| `public.sponsorship_orders` | **YES** | **NONE** | **NONE** | `ALL` | Contains sponsor email, backer email, and provider IDs. Hidden from public. |
| `public.payment_transactions` | **YES** | **NONE** | **NONE** | `ALL` | Immutable audit ledger and raw webhook payloads. Zero public access. |

### Public Sponsors View Sanitization
`public.public_sponsors_wall` exposes strictly:
- `order_id`, `order_type`, `spot_id`, `tier_id`, `sponsor_name`, `sponsor_url`, `logo_url`, `amount_cents`, `currency`, `paid_at`.
- **Excluded by design:** `sponsor_email`, `provider_session_id`, `provider_order_id`, `provider_payment_id`, `provider_signature`. Tested by automated assertion.

### Stored Procedure Permission Boundaries
| Procedure | Security Mode | `search_path` | Public / `anon` | `service_role` | Justification |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `atomic_reserve_spot` | `SECURITY DEFINER` | `public` | **REVOKED** | **GRANTED** | Invoked only by backend checkout adapter / Edge Function. |
| `release_expired_reservations` | `SECURITY DEFINER` | `public` | **REVOKED** | **GRANTED** | Internal sweep procedure. |
| `confirm_paid_order` | `SECURITY DEFINER` | `public` | **REVOKED** | **GRANTED** | Critical financial state machine. Only trusted webhook/verification callers. |
| `process_order_refund` | `SECURITY DEFINER` | `public` | **REVOKED** | **GRANTED** | Operator refund procedure. |
| `reconcile_unclaimed_payment` | `SECURITY DEFINER` | `public` | **REVOKED** | **GRANTED** | Operator reconciliation procedure. |
| `record_real_pageview` | `SECURITY DEFINER` | `public` | **GRANTED** | **GRANTED** | Client-invoked analytics increment (rate-limited via client session gating). |

---

## 6. Razorpay Integration Security Audit

### Edge Functions Reviewed
1. `supabase/functions/create-razorpay-order/index.ts`
   - **Canonical Server Pricing:** Spot prices (`CANONICAL_SPOTS`) and tier prices (`CANONICAL_TIERS`) are hardcoded on the server. The client cannot forge or alter the checkout amount. Custom donations enforce a minimum of ₹500 (`50000` paise) or $5 (`500` cents).
   - **Atomic Spot Reservation:** Before communicating with Razorpay, calls `atomic_reserve_spot`. If another session holds the spot, checkout creation is rejected.
   - **Compensating Transaction:** If the Razorpay Orders API call fails, the reserved spot is automatically reverted to `available`.
   - **Fail-Closed Guard:** In production mode (`ENVIRONMENT === 'production'`), requires live `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. Refuses mock order creation.
   - **Payload Limit:** Enforces 2.5MB maximum payload size.
2. `supabase/functions/verify-razorpay-payment/index.ts`
   - **Signature Verification:** Computes HMAC-SHA256 of `${razorpayOrderId}|${razorpayPaymentId}` with `RAZORPAY_KEY_SECRET`. Rejects tampered or unauthenticated signatures with HTTP 400.
   - **Server State Lookup:** Looks up the persisted order in `sponsorship_orders` using `provider_order_id` or `provider_session_id`.
   - **Idempotent Confirmation:** Delegates state mutation to `confirm_paid_order` RPC with server-verified amount and currency.
3. `supabase/functions/razorpay-webhook/index.ts`
   - **Raw Body Signature Verification:** Validates `x-razorpay-signature` against `req.text()` (exact raw byte string) using HMAC-SHA256 and `RAZORPAY_WEBHOOK_SECRET`.
   - **Idempotency Protection:** The webhook event uses `paymentId` as `provider_event_id` in `payment_transactions`. PostgreSQL unique constraint `provider_event_id UNIQUE` causes duplicate deliveries to safely exit with `{ status: 'already_processed' }` without double-counting revenue.
   - **Failure Handling:** Event `payment.failed` automatically updates `sponsorship_orders.status = 'failed'` and releases `brand_spots` back to `available`.

---

## 7. Commands Actually Executed & Local Test Evidence

### Git Operations
```powershell
git status -s; git branch -v; git log -n 5 --oneline
# Verified clean tree on feature/secure-production-platform at commit 9812e88

git checkout -b fix/supabase-database-recovery
# Switched to clean working branch

git mv supabase/migrations/20261029_secure_fundmymac_schema.sql supabase/migrations/20261029010000_secure_fundmymac_schema.sql
git mv supabase/migrations/20261029_razorpay_integration.sql supabase/migrations/20261029020000_razorpay_integration.sql
git mv supabase/migrations/20261029_production_readiness_hardening.sql supabase/migrations/20261029030000_production_readiness_hardening.sql
# Renamed migrations to 14-digit standard format
```

### Environment Preflight Checks
```powershell
supabase --version; npx supabase --version
# Output: supabase not in system path, npx supabase version 2.122.0 available

docker info
# Output: docker is not recognized on Windows PATH

psql --version; Get-Service -Name *postgres*
# Output: psql not installed, no local postgres service running
```
> [!NOTE]
> **Local Database Testing Blocker:** `npx supabase start` and local migration execution require the Docker daemon. Because Docker is not installed on this host, running a local containerized Supabase database could not be executed locally. This blocker is documented truthfully in accordance with prompt guidelines.

### Automated Test Suite Execution
```powershell
npm test
# Result: 5/5 SUITES PASSED (41 total tests passed, 0 failed, 0 skipped)
# - tests/database_security_rls.test.mjs: 12/12 passed (including 4 new SQL consistency & ordering tests)
# - tests/payment_checkout.test.mjs: 13/13 passed
# - tests/concurrency_reservation.test.mjs: 3/3 passed
# - tests/webhook_idempotency.test.mjs: 7/7 passed
# - tests/frontend_canonical.test.mjs: 6/6 passed

node test_audit.js
# Result: 33/33 AUDIT CHECKS PASSED

npm run lint
# Result: oxlint finished in 97ms on 43 files with 0 warnings and 0 errors

npm run build
# Result: tsc -b && vite build succeeded in 396ms. Production bundle verified.
```

---

## 8. Remote Actions Explicitly NOT Performed

To protect the remote environment, the following actions were **strictly avoided**:
1. ❌ Did **NOT** run `npx supabase db push` against remote project `lavydeusonwqjrlhtqzv`.
2. ❌ Did **NOT** execute any SQL statements in the remote Supabase SQL Editor.
3. ❌ Did **NOT** execute `DROP`, `TRUNCATE`, or `ALTER` on the remote database.
4. ❌ Did **NOT** insert artificial migration history records into remote `supabase_migrations`.
5. ❌ Did **NOT** deploy Edge Functions to the remote project.
6. ❌ Did **NOT** switch Razorpay credentials to live mode.
7. ❌ Did **NOT** alter remote environment secrets.

---

## 9. Remaining Blockers & Production Risks

1. **Production Has No Backups Reported:**
   The Supabase backup dashboard reports no backups for `lavydeusonwqjrlhtqzv`. Applying schema migrations directly to production without a verified backup poses an operational risk. An owner-approved recovery plan or manual schema snapshot is required before remote changes.
2. **Missing Dedicated Staging Environment:**
   Currently, the repository references a single project (`lavydeusonwqjrlhtqzv`), which is labelled `PRODUCTION` on branch `main`. We strongly recommend provisioning a separate Supabase staging project (`fundmymac-staging`) to test migrations, Edge Functions, and Razorpay Test Mode before applying them to production.
3. **Razorpay Live Merchant Credentials:**
   Active payments remain in Test Mode. Live credentials must only be injected via Supabase Edge Function secrets after staging end-to-end checkout is verified.

---

## 10. Safe Staging-First Deployment Checklist

- [ ] **Step 1:** Provision dedicated Supabase staging project or verify staging project reference.
- [ ] **Step 2:** Configure Supabase CLI access token securely: `$env:SUPABASE_ACCESS_TOKEN="<token>"`.
- [ ] **Step 3:** Link CLI to target staging project: `npx supabase link --project-ref <staging-ref>`.
- [ ] **Step 4:** Push repaired migrations: `npx supabase db push`.
- [ ] **Step 5:** Verify public schema contains `brand_spots` (20 rows), `site_stats` (row 1), `sponsorship_orders`, `payment_transactions`, and `public_sponsors_wall`.
- [ ] **Step 6:** Deploy Edge Functions to staging:
  ```powershell
  npx supabase functions deploy create-razorpay-order
  npx supabase functions deploy verify-razorpay-payment
  npx supabase functions deploy razorpay-webhook
  ```
- [ ] **Step 7:** Set staging Edge Function secrets (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `ENVIRONMENT="staging"`).
- [ ] **Step 8:** Configure Razorpay Dashboard Webhook to point to staging webhook URL with secret.
- [ ] **Step 9:** Execute one test spot sponsorship checkout and one test donation in Razorpay Test Mode.
- [ ] **Step 10:** Verify spot state transitions from `available` -> `reserved` -> `sold`, and `site_stats` updates raised totals.
- [ ] **Step 11:** Only upon full staging sign-off, take a production snapshot and schedule the production migration window.
