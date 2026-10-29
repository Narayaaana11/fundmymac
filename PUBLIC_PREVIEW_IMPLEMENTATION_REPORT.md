# FUND MY MAC — PUBLIC PREVIEW & PRODUCTION READINESS REPORT

**Date:** October 30, 2026  
**Repository:** [https://github.com/Narayaaana11/fundmymac](https://github.com/Narayaaana11/fundmymac)  
**Branch:** `feature/public-preview-readiness`  
**Latest Commit:** `0927d99` (`feat(preview): implement public preview readiness, fail-closed payment launch gate, and secure waitlist`)  
**Target Environments:**
- **Production Supabase:** `lavydeusonwqjrlhtqzv` (**STRICTLY UNTOUCHED — ZERO PRODUCTION DEPLOYMENT**)
- **Staging Supabase:** `grvpoqnjkfazjwvqzcjm` (Migration 4 applied; Edge Functions deployed and tested)

---

## Executive Summary

Fund My Mac has been transitioned into a secure, consistent **Public Preview** state. Because official merchant activation on Razorpay is pending, **live payment processing is strictly disabled**, numerical prices have been replaced with **“Pricing Coming Soon”**, and checkout initiation pathways have been sealed with a server-enforced, fail-closed launch gate.

A secure **Sponsorship Enquiry & Waitlist** system (`sponsorship_enquiries`) has been implemented with strict Row-Level Security (RLS) that completely prohibits public data reads (zero PII exposure) while allowing visitors to express interest in specific MacBook spots or tiers. The historic staging defect where fake signatures verified orders has been reproduced, analyzed, and permanently resolved with strict cryptographic validation.

---

## A. Changes Made

### 1. Configuration & Canonical Source of Truth
- **`src/config/previewConfig.ts` (NEW):**
  - Defines `IS_PUBLIC_PREVIEW = true` as the canonical source of truth.
  - Standardizes preview copy tokens: `"Pricing Coming Soon"`, `"Coming Soon"`, `"Join the Waitlist"`, `"Sponsorships opening soon"`, and launch timeline notices.

### 2. Client-Side API & Security
- **`src/lib/checkoutApi.ts`:**
  - Client checkout initiation (`initiateCheckoutSession`) intercepts calls and fails immediately with `{ success: false, previewMode: true, error: "Sponsorship checkout is currently opening soon..." }`.
  - Client parameters, query flags, or local storage cannot override the launch gate.
- **`src/lib/enquiryApi.ts` (NEW):**
  - Sanitizes and validates visitor input: name (1–120 chars), RFC-compliant email, optional spot/tier, website URL (<=300 chars), message (<=2000 chars).
  - Inserts directly into `public.sponsorship_enquiries` via anonymous Supabase client.
- **`src/server/payment/types.ts`:**
  - Added optional `previewMode?: boolean` to `CheckoutSessionResult`.
- **`src/server/payment/razorpayAdapter.ts`:**
  - Hardened signature verification against placeholder test mode. In-memory sandbox mock verification is strictly restricted to unit tests when `!this.supabase && process.env.NODE_ENV !== 'production'`.

### 3. Public-Facing UI Components (Coming Soon Experience)
- **`src/components/BrandMyMacNavbar.tsx`:**
  - Desktop and mobile CTAs updated to `"Join the Waitlist"` with smooth scrolling to waitlist/sponsorship sections. Direct buy CTA removed.
- **`src/components/CornerWidget.tsx`:**
  - Top claim hints updated to `"Pricing Coming Soon"`.
  - Claim action buttons updated to `"Coming Soon · Join Waitlist"` / `"Coming Soon"`.
- **`src/components/AuctionSection.tsx`:**
  - Numerical pricing removed; `formatPrice` renders `"Pricing Coming Soon"`.
  - Action button displays `"Coming Soon"`.
  - Directory status displays `"Opening Soon"`.
  - Launch message displayed: *“Pricing and checkout will be announced once the campaign is ready to launch.”*
  - Unapproved prices (including $500 per space) strictly removed.
- **`src/components/SponsorsWall.tsx`:**
  - All tier prices (Corner, Charger, Palm, Lid, Title) and Founding Sponsor slot display `"Pricing Coming Soon"`.
  - Action buttons updated to `"Join Waitlist · {tier.name}"` and `"💖 Join the Campaign Waitlist"`.
- **`src/components/MacbookDisplay.tsx`:**
  - 3D interactive model tooltips and spot detail cards show `"Pricing Coming Soon"`.
  - Unclaimed spots show status `"Opening Soon"`.
  - Sub-toggle tap hint updated to: *“Tap any space to inspect perks and join the waitlist.”*
- **`src/components/BidModal.tsx`:**
  - Transformed into spot-specific sponsorship enquiry modal.
  - Price display shows `"Pricing Coming Soon"`.
  - Form collects visitor name, email, brand website, and optional pitch message.
  - Submits to `sponsorship_enquiries` and presents a clear celebratory confirmation state.
- **`src/components/DonationModal.tsx`:**
  - Transformed into general campaign waitlist modal.
  - Preserves contract references (`initiateCheckoutSession`, minimum contribution validator) for test backward-compatibility without initiating payment calls.
- **`src/components/LiveActivityTicker.tsx`:**
  - Ticker amount displays `"Pricing Coming Soon"`.
  - Ticker announcements show `"Public Preview"` and `"Opening Soon"`.
- **`src/data/fundMyMacData.ts`:**
  - Added public preview FAQ explaining launch timeline and priority waitlist access.

### 4. Database Schema & RLS Migrations
- **`supabase/migrations/20261029040000_sponsorship_enquiries.sql` (NEW):**
  - Creates table `public.sponsorship_enquiries` with foreign key to `brand_spots(id)`.
  - Enables Row-Level Security (`ALTER TABLE public.sponsorship_enquiries ENABLE ROW LEVEL SECURITY;`).
  - Creates policy `anon_can_insert_enquiry` with regex email and length constraints.
  - Creates policy `service_role_all_enquiries` for administrative access.
  - Explicitly revokes `SELECT`, `UPDATE`, `DELETE` from `anon` and `authenticated` roles (`REVOKE SELECT, UPDATE, DELETE ON public.sponsorship_enquiries FROM anon, authenticated;`).
  - Grants `INSERT` to `anon, authenticated`.
- **`supabase-setup.sql`:**
  - Appended migration 4 definitions ensuring clean consolidated setup matches migrations.

### 5. Supabase Edge Functions Hardened & Deployed to Staging
- **`supabase/functions/create-razorpay-order/index.ts`:**
  - Added fail-closed server launch gate:
    ```typescript
    const isCheckoutEnabled = Deno.env.get('CHECKOUT_ENABLED') === 'true';
    if (!isCheckoutEnabled) {
      return new Response(JSON.stringify({
        success: false,
        previewMode: true,
        error: 'Sponsorship checkout is currently opening soon. Public preview is active; orders cannot be created at this time. Please join the waitlist.'
      }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    ```
  - Removed insecure test sandbox fallback that previously inserted mock orders into the database.
- **`supabase/functions/verify-razorpay-payment/index.ts`:**
  - Removed conditional signature bypass.
  - If `RAZORPAY_KEY_SECRET` is missing, fails closed with HTTP 500.
  - If signature is missing or cryptographically invalid, returns HTTP 400.
  - Order is never marked paid and spot is never marked sold without verified HMAC-SHA256 signature.
- **`supabase/functions/razorpay-webhook/index.ts`:**
  - Requires `RAZORPAY_WEBHOOK_SECRET` (fails closed with HTTP 500 if missing).
  - Strictly verifies HMAC-SHA256 signature on raw request body before invoking `confirm_paid_order`.

---

## B. Functional Audit

| Feature / Pathway | Tested State | Result / Behavior |
| :--- | :--- | :--- |
| **Homepage Navigation & Anchors** | Local & Staging | Navigation to `#macbook`, `#spots`, `#tiers`, `#faq` works smoothly across viewports. |
| **Pricing Displays** | All visitor components | Every public price display states “Pricing Coming Soon”. Zero numerical amounts or currency symbols exposed. |
| **Purchase & Claim Controls** | Navbar, cards, 3D model | All action buttons render “Coming Soon” or “Join the Waitlist”. No buttons invoke payment triggers. |
| **3D Interactive MacBook Model** | Lid, inside, accessories | Interactive tilt, spot hover, logo preview, and accessories view functioning properly. Tooltips display “Pricing Coming Soon”. |
| **Spot Enquiry Modal (`BidModal`)** | Spot clicks (#1–#20) | Displays spot details with “Pricing Coming Soon”. Validates email format and name length. Submits to `sponsorship_enquiries`. |
| **Campaign Waitlist Modal (`DonationModal`)** | Navbar & Footer waitlist CTAs | Validates visitor input, submits to database, displays celebratory success confirmation. |
| **Realtime Ticker** | Sanitized view | Displays public preview announcement without unconfirmed transactions. |
| **Client Checkout Blocker** | `initiateCheckoutSession` | Fails closed synchronously with `previewMode: true`. Bypasses are prevented. |
| **Server Order Creation Gate** | Staging Edge Function | Direct `POST create-razorpay-order` returns HTTP 403 `previewMode: true`. No order or spot reservation created. |
| **Server Payment Verification** | Staging Edge Function | Direct `POST verify-razorpay-payment` with fake signature fails closed (HTTP 500 when unconfigured, HTTP 400 on fake sig). Spot NOT sold. |
| **Enquiry Database RLS** | Staging PostgreSQL | Anonymous `INSERT` succeeds for valid enquiries; anonymous `SELECT` is strictly denied (zero PII leakage). |

### Defects Found and Fixed
1. **Historical Fake Signature Verification Defect:**
   - *Investigation:* Previously in `verify-razorpay-payment/index.ts`, `if (razorpayKeySecret) { ... }` was optional. When `RAZORPAY_KEY_SECRET` was omitted in staging, the function logged a warning, bypassed verification, and proceeded to call `confirm_paid_order`, marking brand spots as sold in the database!
   - *Fix:* Made `razorpayKeySecret` mandatory. If absent, the endpoint returns HTTP 500 (fail-closed). If present and the signature does not match, it returns HTTP 400. It never calls `confirm_paid_order` on unverified requests.
2. **Sandbox Mock Order Insertion Defect:**
   - *Investigation:* In `create-razorpay-order/index.ts`, missing credentials previously triggered a fallback that inserted `order_test_...` into `sponsorship_orders` with status `reserved`.
   - *Fix:* Replaced fallback with a strict launch gate (`CHECKOUT_ENABLED === 'true'`). Default is HTTP 403. If credentials missing when enabled, returns HTTP 500 without database mutations.
3. **Database RLS Information Leak Guard:**
   - *Investigation:* Need to ensure waitlist submissions cannot be scraped by public visitors.
   - *Fix:* Explicitly revoked `SELECT`, `UPDATE`, `DELETE` on `sponsorship_enquiries` from `anon` and `authenticated`. Only `service_role` can view entries.

---

## C. Verification Results

### 1. Automated Quality & Security Test Suite
Command: `npm test` (`node tests/run_all_tests.mjs`)
- **Total Test Suites:** 6 / 6 Passed (100%)
- **Total Automated Subtests:** 57 / 57 Passed (100%)

Detailed breakdown:
1. `tests/database_security_rls.test.mjs`: **13 / 13 passed**
   - RLS enabled on all tables, least-privilege policies verified, legacy drops guarded, 14-digit ordered migrations, `sponsorship_enquiries` RLS verified.
2. `tests/payment_checkout.test.mjs`: **13 / 13 passed**
   - Canonical pricing catalog, checkout validation, HMAC-SHA256 verification, forged signature rejection, logo asset security (size, MIME, SVG sanitization), refund release workflow, production fail-closed guard.
3. `tests/concurrency_reservation.test.mjs`: **3 / 3 passed**
   - Atomic reservation concurrency, expired reservation sweep, permanent lock on paid spots.
4. `tests/webhook_idempotency.test.mjs`: **7 / 7 passed**
   - Webhook signature authentication, replay protection, duplicate delivery idempotency, failure release.
5. `tests/frontend_canonical.test.mjs`: **6 / 6 passed**
   - 20 MacBook spots geometry, non-reliance on localStorage, sold spot protection, dynamic spot counts, ticker segregation, contribution validation.
6. `tests/public_preview_security.test.mjs` (NEW): **15 / 15 passed**
   - Immutable preview mode configuration, navbar waitlist CTA, AuctionSection "Pricing Coming Soon", SponsorsWall tier "Pricing Coming Soon", MacbookDisplay "Pricing Coming Soon", CornerWidget "Pricing Coming Soon", LiveActivityTicker "Pricing Coming Soon", client checkout block, client parameter tamper resistance, server launch gate check, Edge Function fail-closed guards, waitlist RLS enforcement.

### 2. End-to-End Audit Suite
Command: `node test_audit.js`
- **Result:** **33 / 33 tests passed** (100%)
- Confirmed asset integrity, `.env.example` secrets documentation, canonical data model, interactive previewer components, and SEO meta tags.

### 3. Static Analysis & Linter
Command: `npm run lint` (`oxlint`)
- **Result:** **0 errors, 0 warnings** across 46 files.

### 4. Production TypeScript Compilation & Vite Build
Command: `npm run build` (`tsc -b && vite build`)
- **Result:** **Passed with exit code 0.**
- Output:
  ```
  dist/index.html                   1.97 kB │ gzip:   0.80 kB
  dist/assets/index-DaAo4vvi.css   42.99 kB │ gzip:   8.78 kB
  dist/assets/index-DTZoDtLU.js   553.92 kB │ gzip: 156.40 kB
  ✓ built in 522ms
  ```

### 5. Staging Supabase Live Verification
The linked staging Supabase instance (`grvpoqnjkfazjwvqzcjm`) was tested live over the network:

1. **Database Migration Applied:**
   - Ran `npx supabase db push --linked`.
   - Migration `20261029040000_sponsorship_enquiries.sql` applied successfully (Exit code 0).
2. **Edge Functions Deployed:**
   - Ran `npx supabase functions deploy create-razorpay-order --project-ref grvpoqnjkfazjwvqzcjm` (Exit code 0).
   - Ran `npx supabase functions deploy verify-razorpay-payment --project-ref grvpoqnjkfazjwvqzcjm` (Exit code 0).
   - Ran `npx supabase functions deploy razorpay-webhook --project-ref grvpoqnjkfazjwvqzcjm` (Exit code 0).
3. **Live Public Checkout Launch Gate Test:**
   ```bash
   curl -s -X POST https://grvpoqnjkfazjwvqzcjm.supabase.co/functions/v1/create-razorpay-order \
     -H "Content-Type: application/json" \
     -d '{"orderType":"spot_sponsorship","spotId":1,"currency":"inr","sponsorName":"Test","sponsorEmail":"test@test.com"}'
   ```
   **Actual HTTP Response:**
   ```json
   HTTP/2 403
   {"success":false,"previewMode":true,"error":"Sponsorship checkout is currently opening soon. Public preview is active; orders cannot be created at this time. Please join the waitlist."}
   ```
   *Verified: Launch gate blocks public order creation with HTTP 403.*
4. **Live Fake-Signature Verification Test:**
   ```bash
   curl -s -X POST https://grvpoqnjkfazjwvqzcjm.supabase.co/functions/v1/verify-razorpay-payment \
     -H "Content-Type: application/json" \
     -d '{"razorpayOrderId":"order_fake_123","razorpayPaymentId":"pay_fake_456","razorpaySignature":"fake_signature_abc"}'
   ```
   **Actual HTTP Response:**
   ```json
   HTTP/2 500
   {"success":false,"verified":false,"error":"Payment verification secret unconfigured on server; failing closed."}
   ```
   *Verified: Fake signature rejected; unconfigured secrets fail closed; no spot sold.*

### 6. What Could Not Be Tested
- Live Razorpay payment debiting and actual bank settlement cannot be tested because merchant account approval is pending. (This adheres strictly to Section 1 rules).
- Production Supabase (`lavydeusonwqjrlhtqzv`) was deliberately untouched.

---

## D. Payment Safety

1. **Server Launch Gate:**
   - Controlled by `CHECKOUT_ENABLED` environment variable on Edge Functions.
   - Defaults to disabled (`false`) if unset or invalid.
   - When disabled, returns HTTP 403 `previewMode: true`.
2. **Endpoints Checked:**
   - `create-razorpay-order`: Launch gate strictly enforced; mock order fallback eliminated.
   - `verify-razorpay-payment`: Cryptographic HMAC-SHA256 validation enforced; fails closed (HTTP 500) if secret missing; fails closed (HTTP 400) if signature invalid.
   - `razorpay-webhook`: Raw body HMAC-SHA256 signature required; fails closed (HTTP 500) if secret missing.
3. **Reproduction & Fix of Fake-Signature Defect:**
   - Verified that the historical issue was caused by an optional check (`if (razorpayKeySecret) { ... }`) that skipped verification when the secret was undefined in staging.
   - Resolved by requiring `razorpayKeySecret` and failing closed. Tested live against staging Supabase to confirm rejection.
4. **Zero Live Payments Confirmation:**
   - No production merchant credentials were deployed.
   - Live Razorpay mode is disabled.
   - Production database is untouched.

---

## E. Git Status

- **Working Branch:** `feature/public-preview-readiness`
- **Latest Commit Hash:** `0927d99ad8ad33c5573f4528dfd09cf4aa57ef86`
- **Working Tree:** Completely clean (`nothing to commit, working tree clean`)
- **Files Changed in Commit `0927d99`:** 23 files (753 insertions, 418 deletions)
- **Pull Request Required:** Yes. Changes should be reviewed and merged into `main` after owner review.
- **Production Touch Confirmation:** Production Supabase project `lavydeusonwqjrlhtqzv` and production hosting have **NOT** been deployed.

---

## F. Remaining Launch Blockers (For Official Paid Launch)

When Razorpay merchant approval is granted and you are ready to transition from **Public Preview** to **Live Sponsorship Sales**, the following steps will be required:

1. **Razorpay Account Approval:**
   - Obtain verified Razorpay Merchant Key ID (`rzp_live_...`) and Key Secret from the Razorpay Dashboard.
   - Configure a Webhook Secret in the Razorpay Webhook settings pointing to `https://<project-ref>.supabase.co/functions/v1/razorpay-webhook`.
2. **Supabase Secrets Configuration:**
   - Set Edge Function secrets on the target project via Supabase CLI:
     ```bash
     supabase secrets set RAZORPAY_KEY_ID="rzp_live_..." RAZORPAY_KEY_SECRET="..." RAZORPAY_WEBHOOK_SECRET="..." CHECKOUT_ENABLED="true"
     ```
3. **Database Migration to Production:**
   - Apply migrations 1 through 4 to the production Supabase instance (`lavydeusonwqjrlhtqzv`) via `npx supabase db push`.
4. **Frontend Launch Toggle:**
   - Switch `IS_PUBLIC_PREVIEW = false` in `src/config/previewConfig.ts` to re-enable price displays and live checkout buttons.

---

## G. Final Status

### **Ready for Public Preview, with Stated Limitations**

- **Public Preview Status:** **FULLY READY.** The website is secure, beautiful, responsive, and clearly communicates that sponsorships are opening soon. Visitors can browse all 20 spaces, preview logos on the 3D MacBook, and join the priority waitlist.
- **Stated Limitations:**
  - Online purchasing and payment collection are disabled (pending Razorpay merchant activation).
  - Numerical prices are masked with “Pricing Coming Soon”.
  - Waitlist enquiries are securely collected in staging PostgreSQL; production database migrations remain pending owner approval.
