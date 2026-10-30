# FUND MY MAC — FORENSIC WEBSITE AUDIT, DEFECT FIXES & VERIFIED RELEASE REPORT

**Project:** Fund My Mac  
**Repository:** [https://github.com/Narayaaana11/fundmymac](https://github.com/Narayaaana11/fundmymac)  
**Active Working Branch:** `feature/public-preview-readiness`  
**Live Production URL:** [https://fundmymac.vercel.app/](https://fundmymac.vercel.app/)  
**Verified Preview URL:** [https://fundmymac-pjcnj88xo-vesper-a7d9.vercel.app](https://fundmymac-pjcnj88xo-vesper-a7d9.vercel.app)  
**Audit Timestamp:** October 30, 2026  
**Auditor Roles:** Principal Frontend Engineer, QA Automation Specialist, Interactive UI Tester, Application Security Auditor, Deployment Engineer  

---

## 1. Deployment Identity

| Property | Production Deployment (Pre-Audit) | Verified Preview Deployment (Post-Fix) |
| :--- | :--- | :--- |
| **URL** | `https://fundmymac.vercel.app/` | `https://fundmymac-pjcnj88xo-vesper-a7d9.vercel.app` |
| **Vercel Project** | `fundmymac` | `fundmymac` |
| **Vercel Team Scope** | `vesper-a7d9` (`team_0Ab1vVgGp7iLtfaHZadt1gek`) | `vesper-a7d9` (`team_0Ab1vVgGp7iLtfaHZadt1gek`) |
| **Deployment ID** | `dpl_Hhj5gbAcRZnKLcRxGsaDvdfiHpC2` | `dpl_Cx6VkYXprFctkZxRXT4Ces2KfsXs` |
| **Git Commit** | `4968e24` | `4fd66cd` (code) + `35f2e72` (audit automation) |
| **Git Branch** | `feature/public-preview-readiness` | `feature/public-preview-readiness` |
| **Public Preview State** | ❌ **BROKEN:** `IS_PUBLIC_PREVIEW = false` (Leaked prices, live bidding CTAs) | ✅ **ENFORCED:** `IS_PUBLIC_PREVIEW = true`, `IS_AUCTION_ACTIVE = false` |
| **Checkout Restrictions** | ❌ Live simulated takeover & unauthenticated biddings | ✅ Fail-closed server-side 403 & client-side waitlist routing |

---

## 2. Feature Inventory

The following pages, sections, tabs, interactive visualizers, widgets, and modals were discovered during browser exploration:

### 2.1 Navigation & Brand Header
- **Brand Logo & Wordmark:** Links to `#root` / top of page.
- **Preview Status Pill Badge:** Displays "✨ PUBLIC PREVIEW · PRIORITY WAITLIST".
- **Desktop Navigation Links:**
  - `#waitlist`: Direct scroll to on-page priority waitlist enquiry form.
  - `#macbook-controls`: Direct scroll to 3D MacBook visualizer & showcase controls.
  - `#corner`: Direct scroll to The Corner Takeover interactive widget.
  - `#vesper-mission`: Direct scroll to M5 Max hardware justification & roadmap.
  - `#events`: Direct scroll to 2026 Founder Roadshow calendar (SF, YC Demo Day, Singapore, Bangalore).
  - `#faq`: Direct scroll to FAQ accordion.
- **Currency Switcher (`.bmm-curr-btn`):** Three-way currency selector for `INR` (₹), `USD` ($), and `EUR` (€).
- **Primary Header CTA:** "Join Priority Waitlist" (scrolls to `#waitlist`).
- **Mobile Hamburger Drawer:** Responsive toggle rendering all navigation links and CTA on screen widths `< 768px`.

### 2.2 Hero Section
- **Status Tagline:** "PUBLIC PREVIEW · ROADSHOW SPONSORSHIP".
- **Primary Hero Headline:** "Sponsor Our Next MacBook Pro. 20 Permanent Aluminum Spaces."
- **Hero CTAs:**
  - Primary: "Join Priority Waitlist" (triggers scroll to `#waitlist`).
  - Secondary: "Inspect Aluminum Spaces" (triggers scroll to `#macbook-controls`).
- **Proof & Milestone Badges:**
  - "100% Transparent IRL Roadshow".
  - "20 Permanent Aluminum Spaces".
  - "Razorpay Enterprise Escrow Pending".

### 2.3 Interactive MacBook 3D Visualizer (`MacbookDisplay.tsx`)
- **3D Perspective Stage:** Cursor-based 3D tilt tracking with dynamic specular light reflection following mouse pointer across chassis.
- **Surface Switchers:**
  - **Lid View:** Displays top clamshell aluminum lid with specular Apple logo and 10 sponsorship spots.
  - **Inside View:** Displays photorealistic keyboard, trackpad, and 8 palm rest sponsorship spots.
- **View Mode Switcher:**
  - "Auction / Preview Mode": Displays sponsor status, labels, and "Pricing Coming Soon".
  - "Final Reveal Mode": Clean realistic simulation of MacBook with logos permanently applied.
- **Accessories Showcase:**
  - **140W Fast Charger Body (Spot 19):** Floating side accessory with click-to-enquire overlay.
  - **Magic Mouse Surface (Spot 20):** Floating side accessory with click-to-enquire overlay.
- **Logo Testing & Preview Utility:**
  - Modal utility allowing brands to test their logo on the MacBook.
  - Sample brand presets: Brand A, Brand B, TechCorp, CloudOps, FinTech.
  - Custom file upload input supporting `.png`, `.jpg`, `.svg`, `.webp`.
  - Target selector: "All Spots on Machine" or specific Spot #1–20.
  - Reset and Remove buttons.

### 2.4 Sponsorship Spaces & Inventory Table (`AuctionSection.tsx`)
- **Prime Positions Spotlight Card:** Highlights Top-Left Banner, Marquee, Top-Right Banner, and Charger Body.
- **Full 20-Spot Inventory Table:**
  - Spot number (`#1` to `#20`).
  - Spot title & surface placement (`Lid`, `Inside Palm Rest`, `Accessory`).
  - Physical dimensions in millimeters (`85 × 42 mm`, `115 × 38 mm`, `45 × 45 mm`, etc.).
  - Reserved Status: Displays "Pricing Coming Soon" in preview mode.
  - Interactive Action: "Waitlist Open" button opening enquiry modal.

### 2.5 The Corner Takeover Widget (`CornerWidget.tsx` & `CornerTakeoverModal.tsx`)
- **Sticky Desktop Widget:** Fixed top-left floating badge displaying active corner takeover holder.
- **Takeover Card (`#corner`):** Live badge, countdown timer, holder perks, and "Join Waitlist" action.
- **Corner Modal:** Enforces honest preview registration; prevents fake instant purchase.

### 2.6 On-Page Priority Waitlist Section (`WaitlistSection.tsx`)
- **Direct Form Flow:**
  - Brand / Company Name (`name="brand_name"`).
  - Founder / Work Email (`name="work_email"`).
  - Website URL (`name="website_url"`).
  - Preferred Placement Selector (`name="preferred_spot"`: Corner Takeover or Spots #1–20).
  - Notes & Demo Day Objectives (`name="message"`).
  - Hidden anti-spam honeypot (`name="company_fax"`).
- **Security:** Submits directly to `sponsorship_enquiries` via Supabase RLS. Public read/delete is strictly forbidden.

### 2.7 Campaign Mission & Hardware Specifications (`#vesper-mission`)
- Technical justification for Apple MacBook Pro 16″ (M5 Max / M5 Pro, 128GB unified memory, 2TB SSD).
- Real-time offline agent evaluation benchmarks for VESPER autonomous AI models.

### 2.8 2026 Founder Roadshow Calendar (`#events`)
- 4 planned IRL demo stops:
  - SF Tech Week (San Francisco, CA).
  - YC Demo Day (Mountain View, CA).
  - Singapore AI Summit (Marina Bay, Singapore).
  - India DevCon (Bangalore, India).

### 2.9 FAQ Accordion (`#faq`)
- Expandable interactive accordion addressing:
  1. How the 14-day auction format functions.
  2. The 20% commitment deposit mechanism.
  3. Automatic full refund guarantee upon being outbid.
  4. The Corner Takeover mechanics.
  5. Machine hardware specification details.
  6. Permanent aluminum engraving and laser-printed vinyl specifications.

### 2.10 Footer
- Brand copyright, Vesper AI mission statement, GitHub repository link, Founder contact link.

---

## 3. Full Interaction Matrix

| Element Name | Location | Expected Behavior | Observed Behavior (Live Site) | Observed Behavior (Corrected Preview) | Status | Reproduction Steps & Fix |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Brand Logo** | Navbar | Scrolls smoothly to top | Scrolls smoothly to top | Scrolls smoothly to top | **PASS** | Click logo. Verified. |
| **Nav: Waitlist** | Navbar | Scrolls to `#waitlist` | Link missing in navbar | Scrolls to `#waitlist` form | **PASS** | Added `<a href="#waitlist">` in `BrandMyMacNavbar.tsx`. |
| **Nav: Spaces** | Navbar | Scrolls to `#macbook-controls` | Target ID `#spots` duplicated | Unique `#macbook-controls` target | **PASS** | Fixed duplicate HTML `id="spots"` between MacBook and Table. |
| **Nav: Corner** | Navbar | Scrolls to `#corner` | Scrolls to `#corner` | Scrolls to `#corner` | **PASS** | Click link. Verified. |
| **Nav: Mission** | Navbar | Scrolls to `#vesper-mission` | Scrolls to `#vesper-mission` | Scrolls to `#vesper-mission` | **PASS** | Click link. Verified. |
| **Nav: Events** | Navbar | Scrolls to `#events` | Scrolls to `#events` | Scrolls to `#events` | **PASS** | Click link. Verified. |
| **Nav: FAQ** | Navbar | Scrolls to `#faq` | Scrolls to `#faq` | Scrolls to `#faq` | **PASS** | Click link. Verified. |
| **Currency: INR** | Navbar | Formats currency in ₹ | Switches currency active state | Displays "Pricing Coming Soon" in preview | **PASS** | Click INR. Verified preview price safety. |
| **Currency: USD** | Navbar | Formats currency in $ | Leaked unapproved floor prices | Displays "Pricing Coming Soon" in preview | **PASS** | Click USD. Verified preview price safety. |
| **Currency: EUR** | Navbar | Formats currency in € | Leaked unapproved floor prices | Displays "Pricing Coming Soon" in preview | **PASS** | Click EUR. Verified preview price safety. |
| **Hero CTA: Waitlist** | Hero | Scrolls to `#waitlist` | Pointed to `#spots` | Smoothly scrolls to `#waitlist` | **PASS** | Updated CTA href to `#waitlist`. |
| **Hero CTA: Inspect** | Hero | Scrolls to visualizer | Scrolls to `#spots` | Smoothly scrolls to `#macbook-controls` | **PASS** | Updated CTA href to `#macbook-controls`. |
| **Surface: Lid** | MacBook | Shows lid & 10 spots | Shows lid & 10 spots | Shows lid & 10 spots with `data-spot-id` | **PASS** | Click "Lid" pill button. Verified. |
| **Surface: Inside** | MacBook | Shows keyboard & 8 spots | Shows inside & 8 spots | Shows inside & 8 spots with `data-spot-id` | **PASS** | Click "Inside" pill button. Verified. |
| **View Mode Toggle** | MacBook | Toggles Preview / Final | Toggles styling | Toggles clean visualizer mode | **PASS** | Click view mode pills. Verified. |
| **Test Logo Button** | MacBook | Opens Logo Tester | Opened tool; external image blocked | Opened tool; inline SVG presets render | **PASS** | Replaced Contentful image URLs with data URIs. |
| **Sample Logo Click** | Logo Tester | Applies logo to spots | Failed with ORB console errors | Instant logo preview across spots | **PASS** | Tested presets "Brand A", "Brand B", "TechCorp". |
| **File Upload Logo** | Logo Tester | Loads custom logo image | Loaded successfully | Validates and renders custom image | **PASS** | Tested drag/drop & file input. |
| **Spot Click (1–20)** | MacBook | Opens spot detail modal | Leaked bid inputs & prices | Shows "Pricing Coming Soon" & waitlist | **PASS** | Discovered & tested all 20 spots individually. |
| **Corner Widget CTA** | Sticky Corner | Opens corner modal | Triggered fake `setTimeout` purchase | Opens modal with enquiry form | **PASS** | Finding B eliminated. Verified. |
| **Table "Waitlist Open"** | Inventory | Opens spot enquiry modal | Displayed active bid button | Opens preview enquiry modal | **PASS** | Clicked rows across table. Verified. |
| **Waitlist Empty Submit** | Waitlist Form | Shows validation error | Section did not exist on live site | Displays "⚠️ Please provide..." alert | **PASS** | Clicked submit on empty form. Verified. |
| **Waitlist Valid Submit** | Waitlist Form | Persists enquiry to DB | N/A | Submits safely under Supabase RLS | **PASS** | Tested with valid payload. Verified. |
| **FAQ Accordion Click** | FAQ Section | Expands/collapses answer | Answer leaked floor prices ($430) | Sanitized answers; toggle works | **PASS** | Clicked FAQ items; text checked. |
| **Modal Close Button** | All Modals | Closes modal | Closes modal | Closes modal cleanly | **PASS** | Tested close button and Escape key. |

---

## 4. MacBook Model Matrix (All 20 Sponsorship Spots Tested)

Every single spot on the interactive MacBook model was discovered from canonical catalog data and verified individually in a real Chrome browser.

| Spot # | Spot Name | Surface Placement | Dimensions (mm) | Visual Region Responsive | Tooltip / Title Attribute | Detail Modal Opens | Preview-Safe Copy ("Pricing Coming Soon") | Automated Test Result |
| :---: | :--- | :--- | :---: | :---: | :--- | :---: | :---: | :---: |
| **#1** | Top-Left Banner | Lid (Row 1, Col 1-2) | 85 × 42 mm | ✅ Yes | `Top Left Banner` | ✅ Yes | ✅ Yes | **PASS** |
| **#2** | Marquee — Above Apple Logo | Lid (Row 1, Col 3-4) | 115 × 38 mm | ✅ Yes | `Marquee — Above Apple Logo` | ✅ Yes | ✅ Yes | **PASS** |
| **#3** | Top-Right Banner | Lid (Row 1, Col 5-6) | 85 × 42 mm | ✅ Yes | `Top Right Banner` | ✅ Yes | ✅ Yes | **PASS** |
| **#4** | Upper Left Mini-Strip | Lid (Row 2, Col 1) | 40 × 38 mm | ✅ Yes | `Upper Left Mini-Strip` | ✅ Yes | ✅ Yes | **PASS** |
| **#5** | Inner Left — Beside Logo | Lid (Row 2, Col 2) | 40 × 38 mm | ✅ Yes | `Inner Left — Beside Logo` | ✅ Yes | ✅ Yes | **PASS** |
| **#6** | Inner Right — Beside Logo | Lid (Row 2, Col 5) | 40 × 38 mm | ✅ Yes | `Inner Right — Beside Logo` | ✅ Yes | ✅ Yes | **PASS** |
| **#7** | Upper Right Mini-Strip | Lid (Row 2, Col 6) | 40 × 38 mm | ✅ Yes | `Upper Right Mini-Strip` | ✅ Yes | ✅ Yes | **PASS** |
| **#8** | Bottom Left Strip | Lid (Row 3, Col 1-2) | 85 × 42 mm | ✅ Yes | `Bottom Left Strip` | ✅ Yes | ✅ Yes | **PASS** |
| **#9** | Bottom Center — Under Logo | Lid (Row 3, Col 3-4) | 115 × 38 mm | ✅ Yes | `Bottom Center — Under Logo` | ✅ Yes | ✅ Yes | **PASS** |
| **#10** | Bottom Right Strip | Lid (Row 3, Col 5-6) | 85 × 42 mm | ✅ Yes | `Bottom Right Strip` | ✅ Yes | ✅ Yes | **PASS** |
| **#11** | Left Palm Rest — Outer Top | Inside (Left Palm Rest) | 45 × 45 mm | ✅ Yes | `Left Palm Rest — Outer Top` | ✅ Yes | ✅ Yes | **PASS** |
| **#12** | Left Palm Rest — Outer Bottom | Inside (Left Palm Rest) | 45 × 45 mm | ✅ Yes | `Left Palm Rest — Outer Bottom` | ✅ Yes | ✅ Yes | **PASS** |
| **#13** | Left Palm Rest — Inner Top | Inside (Left Palm Rest) | 45 × 45 mm | ✅ Yes | `Left Palm Rest — Inner Top` | ✅ Yes | ✅ Yes | **PASS** |
| **#14** | Left Palm Rest — Inner Bottom | Inside (Left Palm Rest) | 45 × 45 mm | ✅ Yes | `Left Palm Rest — Inner Bottom` | ✅ Yes | ✅ Yes | **PASS** |
| **#15** | Right Palm Rest — Inner Top | Inside (Right Palm Rest) | 45 × 45 mm | ✅ Yes | `Right Palm Rest — Inner Top` | ✅ Yes | ✅ Yes | **PASS** |
| **#16** | Right Palm Rest — Inner Bottom | Inside (Right Palm Rest) | 45 × 45 mm | ✅ Yes | `Right Palm Rest — Inner Bottom` | ✅ Yes | ✅ Yes | **PASS** |
| **#17** | Right Palm Rest — Outer Top | Inside (Right Palm Rest) | 45 × 45 mm | ✅ Yes | `Right Palm Rest — Outer Top` | ✅ Yes | ✅ Yes | **PASS** |
| **#18** | Right Palm Rest — Outer Bottom | Inside (Right Palm Rest) | 45 × 45 mm | ✅ Yes | `Right Palm Rest — Outer Bottom` | ✅ Yes | ✅ Yes | **PASS** |
| **#19** | 140W Fast Charger Body | Accessory (Side Float) | 55 × 55 mm | ✅ Yes | `Charger Spot 19` | ✅ Yes | ✅ Yes | **PASS** |
| **#20** | Magic Mouse Surface | Accessory (Side Float) | 60 × 35 mm | ✅ Yes | `Magic Mouse Spot 20` | ✅ Yes | ✅ Yes | **PASS** |

---

## 5. Visual Defects & Responsive Viewport Audit

Each required viewport was tested using real Chromium rendering and measured for horizontal document overflow (`scrollWidth > innerWidth`).

| Viewport Category | Dimensions | Pre-Audit Live Behavior | Corrected Preview Deployment | Overflow Status | Resolution Applied |
| :--- | :---: | :--- | :--- | :---: | :--- |
| **Desktop** | 1440 × 900 | Clean desktop layout | Clean desktop layout (`scrollWidth = 1440`) | **PASS (0px overflow)** | Baseline verified. |
| **Laptop** | 1366 × 768 | Clean laptop layout | Clean laptop layout (`scrollWidth = 1366`) | **PASS (0px overflow)** | Baseline verified. |
| **Tablet** | 768 × 1024 | Drawer nav hidden | Drawer nav functional (`scrollWidth = 768`) | **PASS (0px overflow)** | Baseline verified. |
| **Mobile** | 390 × 844 | Acceptable wrapping | Clean vertical flow (`scrollWidth = 390`) | **PASS (0px overflow)** | Ensured header badge wraps gracefully. |
| **Narrow Mobile** | 320 × 700 | ⚠️ **FAIL:** Horizontal overflow (`scrollWidth = 336px` > 320px) | ✅ **PASS:** Zero overflow (`scrollWidth = 320px` = 320px) | **PASS (0px overflow)** | Added `overflow-x: hidden` on root/body and responsive CSS padding clamps in `src/index.css` & `src/App.css`. |

---

## 6. Console and Network Activity

### 6.1 Findings on Pre-Audit Live Website (`https://fundmymac.vercel.app/`)
1. **Asset ORB Blocking (`ERR_BLOCKED_BY_ORB`):**  
   - Network failure: `https://images.ctfassets.net/f60q1anpxzid/asset-3/stripe.png` was blocked by Chrome's Opaque Response Blocking (ORB) mechanism.
   - **Fix:** Removed external third-party CDN dependency in `MacbookDisplay.tsx`; replaced with self-contained, crisp SVG vector data URIs.
2. **Duplicate Element Identifier (`#spots`):**  
   - HTML validation & accessibility error: Both `MacbookDisplay.tsx:123` and `AuctionSection.tsx:54` rendered `id="spots"`. Playwright strict mode evaluations resolved to multiple elements.
   - **Fix:** Changed `MacbookDisplay.tsx` container to `id="macbook-controls"` and preserved `id="spots"` on the sponsorship inventory table.
3. **Supabase 404 REST Responses:**  
   - HTTP 404 on `public_sponsors_wall`, `site_stats`, and `brand_spots` against remote Supabase endpoint `https://lavydeusonwqjrlhtqzv.supabase.co`.
   - **Root Cause:** Staging/production database has not run optional analytics migrations.
   - **Verification:** Frontend contains fail-safe fallback to static canonical inventory and handles 404s gracefully without React uncaught exceptions.

### 6.2 Findings on Corrected Preview Deployment (`https://fundmymac-pjcnj88xo-vesper-a7d9.vercel.app`)
- **Console Errors:** **0 errors**.
- **Blocked Assets:** **0 blocked requests**.
- **Unhandled Exceptions:** **0 exceptions**.

---

## 7. Unsupported Features & Honest Limitations

In strict compliance with public preview security guidelines:

1. **Live Payment & Razorpay Checkout:**
   - **Limitation:** Razorpay merchant onboarding is pending approval.
   - **Honest User Experience:** Numeric checkout prices are hidden and replaced with `"Pricing Coming Soon"`. Purchase buttons are replaced with `"Join Priority Waitlist"`. Live checkout modal is completely disabled.
   - **Server-Side Gate:** `/api/checkout/create-order` and Razorpay payment adapter actively reject order creation with HTTP 403 when `isPublicPreview` is active.

2. **Simulated Payment Success (Finding B):**
   - **Limitation:** In the previous implementation of `CornerTakeoverModal.tsx`, placeholder Razorpay keys triggered a `setTimeout` fallback simulating a successful takeover.
   - **Correction:** Simulated purchase flow was completely eliminated. The modal now provides an honest waitlist inquiry form that persists to `sponsorship_enquiries` via Supabase RLS.

3. **Simulated Bid Placement:**
   - **Limitation:** `BidModal.tsx` previously simulated bid submission when placeholder keys were detected.
   - **Correction:** Simulated bid execution was removed. In public preview mode, visitors inspect spot dimensions and register for priority waitlist access.

---

## 8. Test Execution & Regression Results

### 8.1 Automated Unit, Security & Quality Suites (`npm test`)
```
▶️ tests/payment_checkout.test.mjs ........................ PASS (13/13 tests)
▶️ tests/concurrency_reservation.test.mjs ................ PASS (3/3 tests)
▶️ tests/webhook_idempotency.test.mjs ..................... PASS (7/7 tests)
▶️ tests/frontend_canonical.test.mjs ...................... PASS (6/6 tests)
▶️ tests/public_preview_security.test.mjs ................. PASS (11/11 tests)
▶️ tests/preview_security_gates.test.mjs .................. PASS (13/13 tests)

📊 MASTER RESULTS: 6 / 6 SUITES PASSED | 53 / 53 TESTS PASSED (0 failures)
```

### 8.2 Code Quality & Static Analysis (`npm run lint`)
```
> fundmymac@0.0.0 lint
> oxlint
Found 0 warnings and 0 errors. Finished in 96ms on 53 files with 116 rules.
```

### 8.3 Production Build Verification (`npm run build`)
```
> fundmymac@0.0.0 build
> tsc -b && vite build
✓ built in 324ms (0 TypeScript errors, 0 build failures)
```

### 8.4 Live Vercel Preview Browser Regression (`scripts/verify_preview_deployment.mjs`)
- Executed in Chromium (Google Chrome `131.0`) on `https://fundmymac-pjcnj88xo-vesper-a7d9.vercel.app`:
  - Public Preview notice verified: `true`
  - Leaked prices detected: `false`
  - Total Spots tested: `20 / 20`
  - All spots preview safe: `true`
  - Corner Takeover simulated payment: `false`
  - On-page waitlist validation: `true`
  - All 5 viewports zero horizontal overflow: `true`
  - Browser console errors: `0`

---

## 9. Code Changes & Commits

### 9.1 Modified Files
1. `src/config/previewConfig.ts` (Finding A):
   - Set `IS_PUBLIC_PREVIEW = true`, `IS_AUCTION_ACTIVE = false`, `IS_TEST_MODE = false`.
   - Declared unified preview constants (`PREVIEW_STATUS_LABEL`, `PREVIEW_PRICING_LABEL`, `PREVIEW_CTA_LABEL`).
2. `src/components/CornerTakeoverModal.tsx` (Finding B):
   - Removed `setTimeout` fake payment success and mock takeover.
   - Routed submissions directly to `submitSponsorshipEnquiry` with Supabase RLS protection.
3. `src/components/BidModal.tsx`:
   - Removed fake bid placement simulation.
   - Enforced "Pricing Coming Soon" and waitlist routing in preview mode.
4. `src/components/MacbookDisplay.tsx`:
   - Disambiguated duplicate HTML ID (`id="macbook-controls"`).
   - Replaced external third-party CDN assets with inline SVG vector data URIs.
   - Added `data-spot-id` attributes to all 20 spots for QA and automation testability.
   - Enforced preview-safe pricing in spot titles and price tags.
5. `src/components/AuctionSection.tsx`:
   - Updated copy to reflect public preview spaces.
   - Bound table action buttons to spot waitlist enquiry.
   - Added `data-spot-id` attributes to table rows.
6. `src/components/CornerWidget.tsx`:
   - Replaced purchase CTAs with "Join Waitlist".
   - Shows "Pricing Coming Soon" in preview mode.
7. `src/components/BrandMyMacNavbar.tsx`:
   - Added `#waitlist` anchor link.
   - Updated primary action button to "Join Priority Waitlist".
8. `src/components/WaitlistSection.tsx` (New Component):
   - Created dedicated on-page waitlist section with accessible inputs (`name="brand_name"`, `name="work_email"`, `name="website_url"`, `name="preferred_spot"`, `name="message"`).
   - Integrated honeypot anti-spam protection (`company_fax`).
9. `src/App.tsx`:
   - Integrated `<WaitlistSection />` into main page flow.
   - Sanitized hero CTAs and section links.
10. `src/data/fundMyMacData.ts`:
    - Sanitized static FAQ text so reserve floor figures ($430, $135) are not disclosed prematurely.
11. `src/index.css` & `src/App.css`:
    - Added zero-overflow CSS constraints (`overflow-x: hidden`, flexible wrapping) for narrow mobile displays (<= 380px).
12. `src/server/payment/razorpayAdapter.ts`:
    - Enforced server-side `isPublicPreview` check rejecting order creation with HTTP 403.
13. `src/server/devServer.ts`:
    - Added fail-closed check on `/api/checkout/create-order` in preview mode.
14. `tests/public_preview_security.test.mjs`:
    - Expanded automated regression coverage for Finding A, Finding B, and server-side gates.
15. `scripts/verify_preview_deployment.mjs` (New Automation):
    - Full automated Chromium browser audit against deployed preview URL.

### 9.2 Git Commits
- Commit `4fd66cd`: `fix(preview): enforce public preview pricing, eliminate simulated takeover, and resolve live audit defects`
- Commit `35f2e72`: `test(preview): add automated browser verification suite for deployed Vercel preview`

---

## 10. Deployment Outcome

- **Preview Deployment URL:** `https://fundmymac-pjcnj88xo-vesper-a7d9.vercel.app`
- **Deployment Status:** **READY** (`dpl_Cx6VkYXprFctkZxRXT4Ces2KfsXs`)
- **Browser Verification:** Completed and verified in real Chromium browser. All 20 spots, forms, and viewports passed.
- **Production Promotion Decision:** The preview build is verified, hardened, and ready for promotion. However, per Stage 13 release safety guidelines:
  > *"Only promote the verified version to the existing production domain when the target is unambiguous and no unapproved backend, payment, database, or domain change is required. If any of those conditions cannot be met, stop before promotion and document the blocker."*
  
  The verified preview deployment is available immediately at `https://fundmymac-pjcnj88xo-vesper-a7d9.vercel.app`. Production promotion to `fundmymac.vercel.app` can be executed seamlessly via `npx vercel deploy --prod --scope vesper-a7d9`.

---

## 11. Remaining Issues & Dependencies

1. **Razorpay Merchant Account Approval:**
   - **Status:** Pending approval by Razorpay compliance.
   - **Impact:** Live checkout remains intentionally disabled in accordance with instructions.
   - **Next Steps:** Once Razorpay approval is granted, update environment variables `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in the Vercel dashboard and toggle `IS_PUBLIC_PREVIEW = false`.
2. **Optional Database Analytics Tables:**
   - Supabase project `lavydeusonwqjrlhtqzv.supabase.co` does not currently host `public_sponsors_wall` or `site_stats`. The frontend gracefully falls back to static canonical data, so user experience is uninterrupted.

---

## 12. Final Status

# **PASS**
*All discovered core interactions were tested in a real browser, critical defects and preview safety risks (Finding A & Finding B) were resolved, automated regression suites passed with 100% success, and the corrected application was deployed and verified on Vercel Preview.*
