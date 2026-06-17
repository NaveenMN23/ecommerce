# Design Decisions — Uniblox E-Commerce Assignment

> These decisions reflect how I approached this problem as a system that will grow —
> not just as an assignment that needs to pass. Each decision calls out the production
> path even when the exercise doesn't require it.

---

## Decision 1: Clean Architecture over Flat MVC

**Context:** The discount and order domain contains rules that will evolve —
nth-order thresholds, coupon eligibility, order lifecycle. These must be testable
and portable, independent of Express or any storage layer.

**Options Considered:**
- Option A: Flat MVC (routes → controllers → models) — fast to scaffold, but domain logic ends up in controllers and becomes untestable without an HTTP server
- Option B: Clean Architecture (domain → application → infrastructure → interfaces) — more upfront structure, but domain has zero external dependencies
- Option C: Hexagonal / Ports & Adapters — conceptually similar to B, better for multiple adapters, more abstract terminology for a small team

**Choice:** Clean Architecture (Option B)

**Why:** The discount rule engine (`DiscountRule.ts`) has zero imports from Express or the store. It is a pure TypeScript module — tested without a server, reusable across services, and readable by a new engineer without understanding the HTTP layer. At Uniblox's scale, where underwriting rules evolve with carrier agreements, this separation means a rule change has one file to edit and one test to update. The blast radius of change is minimised by design.

---

## Decision 2: In-Memory Store Behind an Interface (Repository Pattern)

**Context:** The spec allows in-memory storage. But "temporary" stores become permanent
when no abstraction is built around them. Uniblox will need Redis for distributed state
and Postgres for order audit trails — SOC2 compliance requires immutable, queryable
order history.

**Options Considered:**
- Option A: Plain global object — zero boilerplate, but impossible to test or swap without touching every use case
- Option B: Singleton class with no interface — testable in isolation but tightly coupled to the concrete implementation
- Option C: Singleton class implementing an `AppStore` interface, injected via constructor into every use case

**Choice:** Option C — `InMemoryStore implements AppStore`

**Why:** Every use case is typed against `AppStore`, not `InMemoryStore`. This means:
(1) unit tests pass a two-line mock object with no Express or file I/O,
(2) a `RedisStore` or `PostgresStore` requires changing exactly one file in `src/infrastructure/store/`, and
(3) the interface acts as a contract — store logic cannot leak into the domain.
The `orderCount` field on the store is a deliberate design: in a multi-instance production deployment, this would move to a Redis INCR (atomic, distributed) without any domain changes.

---

## Decision 3: Per-User Order Count for nth-Order Logic (not Global)

**Context:** The spec says "every nth order gets a coupon." It does not specify
whether nth is counted globally or per-user. This is a meaningful ambiguity with
different business implications.

**Options Considered:**
- Option A: Global nth order — simpler; one counter; every 5th store order (regardless of who placed it) triggers coupon eligibility; models a store-wide promotion
- Option B: Per-user nth order — rewards loyal individual customers; more personalised; requires tracking order count per user

**Choice:** Option B — per-user order count via `userOrderCounts: Map<string, number>`

**Why:** A global counter rewards randomness, not loyalty. The 5th customer of the day earns a coupon — not the customer who placed their 5th order. Per-user counting turns the discount system into a genuine loyalty programme: every user earns at their own 5th, 10th, 15th order. The two counters (`orderCount` global + `userOrderCounts` per-user) are kept separate because they serve different masters — global for admin stats, per-user for reward eligibility. In production, `userOrderCounts` maps to a Redis HINCRBY on a hash keyed by userId — atomic, distributed, race-condition-safe.

---

## Decision 4: Dual Coupon Tiers (USER_SPECIFIC vs GLOBAL)

**Context:** The assignment specifies one coupon type. The user's own requirements
described two different discount structures — one tied to a specific user's order
history, one for general campaigns.

**Options Considered:**
- Option A: Single coupon type — simpler, matches the minimum spec
- Option B: Dual coupon types — USER_SPECIFIC (nth-order reward, bound to one user) and GLOBAL (admin campaign, usable by anyone), with separate discount tiers

**Choice:** Option B — dual types with `CouponType = 'USER_SPECIFIC' | 'GLOBAL'`

**Why:** The two types have fundamentally different redemption rules. USER_SPECIFIC coupons check `coupon.userId === requestingUserId` at checkout — a global coupon doesn't. USER_SPECIFIC are earned (10% off ₹1500+); GLOBAL are issued as campaigns (TIER1: 7.5% off ₹1500+, TIER2: 10% off ₹2000+). Merging them into one type would require nullable fields and conditional logic at every validation point. Keeping them separate makes each path explicit, testable independently, and extensible — a TIER3 coupon is one more entry in `DISCOUNT_CONFIG.TIERS`. The `userId?: string` field encodes the entire binding rule: if present, only that user may redeem; if absent, anyone may.

---

## Decision 5: EventEmitter Fan-out for Post-Order Side Effects

**Context:** After a checkout completes, two things need to happen: generate a coupon
if the user hit a milestone, and log analytics. If these are written inline in
`CheckoutUseCase`, every new post-order action requires modifying checkout logic —
a violation of the Open/Closed Principle.

**Options Considered:**
- Option A: Inline in CheckoutUseCase — simple, but every new side effect requires modifying checkout
- Option B: Node.js EventEmitter fan-out — CheckoutUseCase emits `order.placed`; handlers react independently
- Option C: Message queue (SQS/RabbitMQ) — correct for distributed systems; over-engineered for an in-memory exercise

**Choice:** Option B — typed EventEmitter singleton

**Why:** `CheckoutUseCase` emits `order.placed` and its responsibility ends there. `CouponHandler` and `AnalyticsHandler` listen independently — adding a new post-order behaviour (send confirmation email, push to data warehouse) means writing a new handler and calling `registerHandler()` at startup. CheckoutUseCase never changes. Handler failures do not roll back the order — fire-and-forget semantics are correct here because a failed coupon generation is not a reason to undo a completed payment. In production, the EventEmitter is replaced by SQS or Kafka implementing the same `TypedEventBus` interface — the domain and application layers are untouched.

---

## Decision 6: Stock Validation at Cart-Add AND Checkout (Two-Phase Check)

**Context:** A user adds an item when stock is 5. Before they checkout, another
user buys the last 5 units. If we only check stock at cart-add time, the checkout
would succeed with zero actual stock — a silent oversell.

**Options Considered:**
- Option A: Check stock only at cart-add — simple, but stale cart state causes oversell
- Option B: Check stock only at checkout — correct at checkout but poor UX (user discovers rejection only at the final step)
- Option C: Check at cart-add AND re-validate at checkout — fail fast at add, guarantee correctness at checkout

**Choice:** Option C — validate at both points

**Why:** Cart-add validation gives immediate feedback ("only 3 left"). Checkout re-validation is the safety net for stale carts. Stock is decremented only at checkout — not at cart-add — because the user hasn't committed yet. In production this extends to a reservation/freeze model: stock is soft-reserved at cart-add (Redis TTL of 15 minutes) and hard-decremented at checkout. The `AppStore` interface is already positioned to support this without domain changes.

---

## Decision 7: Typed Errors with HTTP Status Codes Baked In

**Context:** API errors need to carry both a human-readable message and an HTTP
status code. The two common patterns are: check error type in the handler and map
to a status, or encode the status in the error itself.

**Options Considered:**
- Option A: String-based errors — `throw new Error("insufficient stock")` — handler parses the string to determine status code; brittle and untestable
- Option B: Error codes — `throw { code: 'INSUFFICIENT_STOCK', message: '...' }` — handler maps codes to statuses; better but still requires a mapping table
- Option C: Typed error classes extending AppError — each subclass sets its own status in the constructor

**Choice:** Option C — `class InsufficientStockError extends AppError { constructor(...) { super('...', 400) } }`

**Why:** The error handler becomes a single `instanceof AppError` check with no mapping logic. Adding a new business rule violation = one new class; the error handler never changes. Each error subclass is independently testable — `expect(() => ...).toThrow(InsufficientStockError)` is readable and precise. The `Object.setPrototypeOf(this, new.target.prototype)` line in the base class fixes a TypeScript-specific quirk where extending built-in `Error` breaks `instanceof` checks — a subtle but important correctness fix.

---

## Decision 8: Known Limitations and the Production Path for Each

**Context:** An in-memory, single-process implementation makes trade-offs that are
acceptable for this exercise but would be incorrect in a production InsurTech system
handling real payments and inventory. Calling these out is more valuable than pretending
they do not exist — an Engineering Head's job is to know where the bodies are buried.

**Limitation 1: Synchronous EventEmitter (not true fan-out)**

`EventBus.emit()` uses Node.js `EventEmitter`, which is synchronous. When `CheckoutUseCase` calls `eventBus.emit('order.placed', ...)`, the `CouponHandler` and `AnalyticsHandler` run on the same event loop tick before `execute()` returns. This means a slow or throwing handler adds latency to the checkout response — the opposite of the fire-and-forget semantics the architecture intends.

Production fix: `CheckoutUseCase` publishes an `order.placed` message to SQS or Kafka. Handlers become independent Lambda functions or worker services consuming from the queue. The `TypedEventBus` interface is unchanged — only the implementation in `EventBus.ts` swaps from `EventEmitter` to an SQS client.

**Limitation 2: No inventory mutex (race condition on last unit)**

`store.products` is a plain `Map`. Under concurrent load, two requests can both pass the stock check (`product.stock >= quantity`) before either decrements — resulting in overselling the last unit. Node.js is single-threaded so this cannot happen within a single process, but any multi-instance deployment (two Express pods behind a load balancer) reintroduces the race.

Production fix: Stock check and decrement must be atomic. Options: Redis `SETNX` / `DECRBY` with a guard check, or Postgres `UPDATE products SET stock = stock - $qty WHERE id = $id AND stock >= $qty RETURNING id` — if zero rows updated, reject the checkout. The `AppStore` interface already positions us to swap the implementation without touching the domain.

**Limitation 3: No authentication or authorisation**

All routes are open. `userId` is taken from the URL parameter — any caller can place orders or view stats for any user. In production, `userId` must come from a verified JWT claim, not client input.

Production fix: Auth0 or AWS Cognito issues JWTs. An Express middleware validates the token on every request and sets `req.user`. Controllers read `req.user.id` instead of `req.params.userId`. Admin routes (`/api/admin/*`) require an additional `role: admin` claim check. Zero domain or use-case changes required — auth is enforced entirely at the interface layer, consistent with Clean Architecture's dependency rule.

---

## Decision 9: GLOBAL Coupon Redemption via `redeemedBy: string[]`

**Context:** The original coupon entity used `isUsed: boolean` — a single flag indicating
whether a coupon had been consumed. This works for USER_SPECIFIC coupons (one user, one use)
but breaks for GLOBAL coupons, which should be usable by any user but only once per user.
`isUsed: true` would block the second user from using a GLOBAL coupon that the first user redeemed.

**Options Considered:**
- Option A: `isUsed: boolean` — simple, covers USER_SPECIFIC coupons, but a GLOBAL coupon blocked for everyone once any one user uses it
- Option B: Separate coupon redemption table — maps couponCode → userId; correct but introduces a second store entity purely for junction data
- Option C: `redeemedBy: string[]` on the coupon itself — single field encodes full redemption history; USER_SPECIFIC checks length > 0; GLOBAL checks `.includes(userId)`

**Choice:** Option C — `redeemedBy: string[]`

**Why:** The array encodes everything both coupon types need in one field with no join. For USER_SPECIFIC coupons, `redeemedBy.length > 0` is the used check (at most one entry). For GLOBAL coupons, `redeemedBy.includes(userId)` prevents the same user from double-redeeming while keeping the coupon open for other users. At redemption, a single `redeemedBy.push(userId)` is the only mutation. In production, this maps cleanly to a Postgres `coupon_redemptions(coupon_code, user_id, redeemed_at)` table with a unique constraint on `(coupon_code, user_id)` — the array becomes a `SELECT` on that table.

---

## Decision 10: Read-Only Preview Endpoint Instead of Two-Write Checkout

**Context:** A common question in checkout design is whether coupon application should
be a separate step from order placement — "apply coupon → confirm checkout" rather than
"checkout with optional coupon." A two-step flow makes the UI simpler but introduces
state that must be managed between the two calls.

**Options Considered:**
- Option A: Single `POST /checkout/:userId` — atomic; coupon validated and consumed in the same transaction as order creation; no intermediate state
- Option B: Two-write flow — `POST /checkout/:userId/apply-coupon` mutates a "pending discount" on the cart, then `POST /checkout/:userId` finalises; requires rollback if the second call never arrives
- Option C: Single checkout + read-only preview — `POST /checkout/:userId/preview` runs all validations and returns the price breakdown without mutating anything; the actual checkout remains a single atomic write

**Choice:** Option C — single atomic checkout + read-only preview

**Why:** The two-write approach (Option B) creates a reservation window where a coupon is "consumed" but the order hasn't been created. If the user closes the tab, the coupon is spent with no order. Rolling that back requires TTLs, background jobs, or explicit cancel calls — significant complexity with no user-visible benefit. The preview endpoint (Option C) achieves the same UI goal — show the user their discounted total before they click "Pay Now" — with zero side effects. The coupon is validated but not marked as used; `redeemedBy` is not written. The checkout call remains the single source of truth. This is the pattern used by Shopify's `/draft_orders` and Stripe's PaymentIntent preview.

---

## Decision 11: Floating-Point Money — A Known Limitation with a Clear Production Fix

**Context:** All monetary values in this system — `price`, `discountAmount`, `total`,
`totalRevenue` — are stored as TypeScript `number` (IEEE 754 double-precision float).
JavaScript's floating-point arithmetic is famously imprecise: `0.1 + 0.2` evaluates to
`0.30000000000000004`, not `0.3`. For a general-purpose API this is an aesthetic concern;
for an InsurTech system processing premiums, claims, and refunds, it is a correctness
issue that accumulates into material discrepancies at audit time.

**Options Considered:**
- Option A: `number` (IEEE 754) with display-layer rounding — simplest to implement; the `roundMoney()` helper in `GetStatsUseCase` takes this approach; does not solve drift in intermediate calculations, only in display output
- Option B: Integer paise — store all amounts as integers (₹2999.50 → 299950 paise); arithmetic is exact because integers have no fractional representation; convert to decimal only at the JSON serialisation layer
- Option C: `Decimal.js` / `big.js` — arbitrary-precision library; preserves decimal notation in code while preventing float drift; adds a dependency

**Choice for this assignment:** Option A — `number` with `roundMoney()` rounding

**Why, and what production demands:** Option A is acceptable for an in-memory exercise where no financial record is persisted across restarts. The `roundMoney()` helper prevents drift from appearing in API responses or stats. In production at Uniblox, Option B (integer paise) is the correct choice: it eliminates the root cause rather than masking it, has zero additional dependencies, and maps directly to a `BIGINT` column in Postgres — the standard representation for monetary amounts in financial databases. SOC2 Type II audits require that stored financial values are exactly representable, which eliminates Option A in a compliant system.

---

## Decision 12: Idempotency — Checkout Request Replay

**Context:** If a client sends the same checkout request twice — due to a network timeout,
a mobile app retry, or a user double-tapping "Pay Now" — the current implementation
creates two separate orders, decrements stock twice, and may consume the same coupon twice.
Node.js EventEmitter would emit `order.placed` twice, generating two coupons on milestone
orders. There is no guard against replay.

**Options Considered:**
- Option A: No idempotency — simple; relies on clients being well-behaved; acceptable for an assignment, not for a payment path
- Option B: Client-supplied `Idempotency-Key` header (UUID) — industry standard (Stripe, Razorpay, Adyen); server deduplicates on this key; duplicate request returns the original response without re-executing the mutation
- Option C: Content-based deduplication — hash the request body (userId + cart snapshot) and reject duplicates within a time window; no client change required, but fragile — any field difference (timestamp, header) breaks deduplication

**Choice for this assignment:** Option A — no idempotency guard

**Why, and what production demands:** Idempotency requires a durable key store (Redis `SET NX` with TTL) that outlives the request. In an in-memory, single-process implementation with no persistence, there is no store to write idempotency keys into. Implementing a fake in-memory idempotency cache would give false confidence — it would not survive a process restart, which is exactly the failure mode idempotency is designed to protect against. In production, Option B is mandatory: the checkout controller reads `req.headers['idempotency-key']`, checks Redis for an existing result, returns it if found, otherwise executes and stores the result under that key with a 24-hour TTL. Zero domain or use-case changes are required — this is a pure interface-layer concern, consistent with the Clean Architecture separation already in place.
