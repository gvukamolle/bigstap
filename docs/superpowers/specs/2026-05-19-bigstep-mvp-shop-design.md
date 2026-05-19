# BIGSTEP.RU MVP Shop Design

Date: 2026-05-19  
Status: Draft for user review  
Primary goal: launch a mobile-first Russian fashion shop with admin-managed products, checkout, blog, event announcements, founder information, and social links.

## Context

BIGSTEP.RU starts as a commerce-first brand site. The first release must sell the brand's own clothing and accessories, not resale goods. The visual direction is minimalist fashion: light theme only, Russian language only, large typography, restrained layout, and product-first navigation.

Reference direction: `https://www.nobody.solutions/`, extended with stronger CMS, checkout, admin workflows, blog, events, founder content, and future-ready integrations.

## Chosen Approach

Use one Next.js + Payload CMS application backed by PostgreSQL.

This keeps the public site, admin panel, API routes, checkout, webhooks, product data, blog content, and event announcements in one coherent project. Payload provides the admin UI, role-based access, collection modeling, media management, and rich text editor. Next.js provides server rendering, routing, image handling, SEO metadata, and the public React UI.

Rejected alternatives:

- Shopify or another commerce SaaS: faster for generic commerce, but weaker fit for custom Russian checkout, self-employed payment flows, CDEK, custom blog/event/founder content, and full visual control.
- Separate frontend, backend, and CMS services: flexible, but too much operational complexity for this MVP.

## Infrastructure

MVP/development runs locally on the founder's laptop.

Local setup:

- Docker Compose for repeatable local services.
- `web`: Next.js + Payload application.
- `postgres`: local PostgreSQL database.
- Local media storage: MinIO or development filesystem storage, with the code structured so it can move to S3-compatible storage later.
- Environment variables in `.env`; secrets are never committed.
- Public webhook testing through `ngrok`, `cloudflared tunnel`, or an equivalent tunnel.

Future production target:

- One Dockerized Next.js + Payload app server in Russian infrastructure.
- Managed PostgreSQL in the same provider/region.
- S3-compatible object storage for product photos, blog images, event images, and Open Graph images.
- Reverse proxy with SSL, request size limits, rate limits, and health checks.
- Russian/provider CDN later, primarily for images and static assets.

The app should be portable from local laptop to production by changing environment variables and deploying the same container shape.

## Public Site

The public website is commerce-first.

Primary navigation:

- Shop
- Blog
- Events
- Founder
- Social links
- Cart

Pages for MVP:

- Home page with current drop, campaign image, product highlights, and CTA into the shop.
- Product catalog with categories, sale status labels, and mobile-friendly browsing.
- Product detail page with photos, description, price, size or one-size selection, stock/preorder state, preorder shipping note, and add-to-cart.
- Cart page with persisted guest cart.
- Checkout pages or checkout flow.
- Public blog index with categories/tags.
- Blog article page.
- Events index and event detail pages as announcements only.
- Founder/about page.
- Legal/service pages: delivery, payment, returns, public offer, privacy policy, personal-data consent.

Constraints:

- Russian language only.
- Light theme only.
- No user notifications or newsletter in MVP.
- Social links are present in site settings and displayed where relevant.

## Product Model

MVP sells clothing and accessories with simple variants.

Each product can be:

- `sized`: clothing with a controlled list of sizes and stock per size.
- `one_size`: accessories or size-free items with one stock value.

Product fields:

- Title.
- Slug.
- Short description.
- Full description.
- Product images/gallery.
- Category.
- Price.
- Optional sale price.
- Product type: `sized` or `one_size`.
- Sizes and stock per size for `sized` products.
- Stock for `one_size` products.
- Sale status: `in_stock`, `preorder`, `sold_out`, `hidden`.
- Preorder expected dispatch text/date when applicable.
- Publication status: draft/published.
- SEO title, description, Open Graph image.

`in_stock` and `preorder` products can be mixed in one cart and one order. If a cart contains preorder items, checkout must show a clear warning that shipping may happen later because of preorder items. Split shipments are out of scope for MVP.

## Cart And Checkout

Checkout is guest-only. There is no customer account or personal cabinet in MVP.

The cart persists on the client through cookie and/or local storage. A server order is created only after the customer submits checkout details.

Checkout flow:

1. Cart review: products, quantities, selected size or one-size state, sale status, item totals.
2. Customer details: full name, phone, email, city.
3. Delivery: choose CDEK pickup point.
4. Review: customer details, selected pickup point, products, delivery price, total, preorder warning if applicable.
5. Payment: create server-side YooKassa payment and redirect/open payment flow.
6. Webhook: YooKassa confirms payment and the order moves to paid.
7. Admin fulfillment: admin processes the order and delivery workflow.

Before payment creation, the server revalidates product publication status, stock, price, and preorder state. If something changed, checkout returns a clear error and asks the customer to review the cart.

## Payments

Use YooKassa as the primary provider for MVP because it supports self-employed sellers and is a strong fit for Russian card/SBP payment flows.

Payment design:

- All payment secrets stay server-side.
- Payment creation happens on backend routes.
- Store YooKassa payment id, amount, status, raw provider metadata needed for support/debugging, and timestamps.
- Webhook handling is idempotent.
- Failed or cancelled payments leave the order in `pending_payment` or `payment_failed`.
- The customer can retry payment without losing the cart/order context.

Keep a small internal `PaymentProvider` boundary so another provider, such as Robokassa, CloudPayments, or CDEK PAY, can be introduced later without rewriting checkout.

Legal assumption for MVP: products are the brand's own goods, not resale. Product categories and marking requirements still need final legal/accounting review before public launch.

## Delivery

Use CDEK pickup points as the MVP delivery method.

Checkout requirement:

- Customer selects a CDEK pickup point through widget/API integration.
- Store pickup point code, name, address, city, delivery price if available, and raw CDEK metadata needed for fulfillment.
- Payment is blocked until a valid pickup point is selected.

MVP implementation can phase CDEK depth:

- Preferred: select pickup point and calculate delivery data through CDEK integration.
- Acceptable first pass: select/save pickup point structurally, then create the shipment manually in the admin workflow.

Admin order records must support delivery status, tracking number, CDEK metadata, and internal notes.

## Discounts

Discounts are designed into the model and admin from the start.

MVP scope:

- Product-level sale price.
- Simple coupon/discount collection in admin.
- Optional public coupon input controlled by a feature flag.

Out of scope:

- Loyalty program.
- Complex stacking rules.
- Customer segments.
- Automated campaigns.

## Blog

The public blog is part of MVP.

Blog features:

- Blog index.
- Article page.
- Categories/tags.
- Featured image.
- SEO fields.
- Draft/published workflow.
- Rich editor.

The editor should support:

- Paragraphs and headings.
- Images.
- Quotes.
- Dividers.
- Product card/product grid block inserted into article content.
- Event card block inserted into article content.

Blog content should visually match the minimalist fashion direction, not look like a generic corporate CMS output.

## Events

Events are public announcements in MVP. Registration is out of scope for the first release.

Event features:

- Event index.
- Event detail page.
- Title, date/time, location, image, description.
- Optional social/external link.
- Draft/published workflow.
- SEO fields.

Future-ready fields can support registration or ticket-like products later, but no registration UI is built in MVP.

## Founder And Social Links

Founder/about content is managed through CMS rather than hardcoded.

Founder content:

- Photo(s).
- Bio.
- Brand story.
- Optional timeline or milestones.
- Links to social profiles.

Social links are managed in global site settings and can be displayed in navigation, footer, founder page, product pages, event pages, and blog pages.

## Admin And Roles

Admin panel path: `/admin`.

Roles:

- `admin`: full access to products, categories, orders, discounts, blog, events, media, site settings, users, delivery settings, payment settings, and operational fields.
- `editor`: content access only. Can create/edit blog posts, events, media, and content SEO fields. Cannot manage orders, payments, users, critical product stock, or system settings.

Core Payload collections/globals:

- `Products`
- `Categories`
- `Orders`
- `Coupons` or `Discounts`
- `BlogPosts`
- `BlogCategories` or tags
- `Events`
- `Media`
- `FounderProfile` or managed `Pages`
- `SiteSettings`
- `Users`

## Order States

Suggested order statuses:

- `draft`
- `pending_payment`
- `paid`
- `payment_failed`
- `processing`
- `ready_for_cdek`
- `shipped`
- `completed`
- `cancelled`
- `refunded`

Suggested fulfillment fields:

- Selected CDEK pickup point.
- Tracking number.
- Delivery status.
- Admin notes.
- Internal event log.

## Error Handling

Checkout and order handling must be conservative.

Rules:

- Revalidate cart server-side before creating payment.
- Do not allow payment without valid customer data and CDEK pickup point.
- Do not treat a payment as paid until webhook or provider verification confirms it.
- Handle duplicate webhooks idempotently.
- Keep failed orders visible in admin for support/debugging.
- If payment fails, preserve cart/order context so the customer can retry.
- If CDEK is unavailable, block delivery selection with a clear user-facing error.
- If preorder items are present, show the preorder shipping warning before payment.

## SEO, Accessibility, Performance

SEO:

- Server-rendered public pages.
- Per-page metadata.
- Open Graph images.
- Sitemap.
- Robots file.
- Canonical URLs.
- Structured data for `Product`, `Article`, `Event`, and `BreadcrumbList`.

Accessibility:

- Mobile-first layouts.
- Keyboard-focus states.
- Proper form labels and errors.
- Sufficient contrast.
- Touch targets sized for mobile use.

Performance:

- Optimize images.
- Avoid unnecessary client-side JavaScript.
- Keep catalog and product pages fast on mobile.
- Target green Core Web Vitals: LCP, INP, CLS.

## Visual Direction

The approved direction is minimalist fashion:

- Light theme only.
- Large typography.
- Black/white/off-white foundation.
- Strong photography.
- Product-first hierarchy.
- Generous spacing.
- Restrained interaction.
- No decorative gradients, dark theme toggle, or generic SaaS-style card layout.

The first visual companion direction was accepted as the baseline.

## Non-Goals For MVP

- Customer accounts/personal cabinet.
- English localization.
- Dark theme.
- User notifications.
- Email marketing/newsletter.
- Paid event registration.
- Split shipments for mixed preorder and in-stock carts.
- Full loyalty or advanced promotions engine.
- Multi-provider payment UI.
- Full production hosting migration.

## Open Launch Checks

Before public launch, verify:

- Exact YooKassa account type and self-employed setup.
- Fiscal receipt requirements and accounting process.
- Whether each clothing/accessory category requires product marking.
- Final CDEK integration mode and contract/API access.
- Legal pages and personal-data consent text.
- Production hosting provider and data localization requirements.
