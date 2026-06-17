# Design Decisions — Uniblox E-Commerce Assignment

> These decisions reflect how I approached this problem as a system that will grow —
> where the in-memory implementation
> differs from what production demands, I've said so directly.

---

## Decision 1: Clean Architecture over Flat MVC

The discount and order domain contains rules that will evolve — nth-order thresholds,
coupon eligibility, order lifecycle. These must be testable and portable, independent
of Express or any storage layer.

**Options Considered:**
- Option A: Flat MVC (routes → controllers → models) — fast to scaffold, but domain logic ends up in controllers and becomes untestable without an HTTP server
- Option B: Clean Architecture (domain → application → infrastructure → interfaces) — more upfront structure, but domain has zero external dependencies
- Option C: Hexagonal / Ports & Adapters — conceptually similar to B, better for multiple adapters, more abstract terminology for a small team

**Choice:** Clean Architecture (Option B)

**Why:** The discount rule engine (`DiscountRule.ts`) has zero imports from Express or the store. It is a pure TypeScript module — tested without a server, reusable across services, and readable by a new engineer without understanding the HTTP layer. At Uniblox's scale, where underwriting rules evolve with carrier agreements, this separation means a rule change has one file to edit and one test to update. A new engineer can locate and change a discount rule without opening a single route file.

---

## Decision 2: In-Memory Store Behind an Interface (Repository Pattern)

The spec allows in-memory storage. But "temporary" stores become permanent when no
abstraction is built around them. Uniblox will need Redis for distributed state and
Postgres for order audit trails — SOC2 compliance requires immutable, queryable order
history.

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

The spec says "every nth order gets a coupon" but doesn't specify whether *nth* is counted globally (every 5th store order) or per-user (every 5th order by the same customer). A global counter rewards randomness — the 5th shopper of the day gets the coupon, not someone on their 5th purchase. Per-user counting makes it a loyalty mechanism that rewards repeat behaviour, which is the only reading that makes commercial sense.

The two counters in the store (`orderCount` global, `userOrderCounts` per-user) serve different purposes: global count feeds admin analytics, per-user count drives coupon eligibility. They are kept separate rather than deriving one from the other because the two invariants are independent — changing how loyalty milestones are calculated should not touch admin reporting, and vice versa. In production, `userOrderCounts` maps to a Redis `HINCRBY` on a hash keyed by userId — atomic and race-condition-safe under concurrent load.

---

## Decision 4: Dual Coupon Tiers (USER_SPECIFIC vs GLOBAL)

The assignment specifies one coupon type. The requirements described two different
discount structures — one tied to a specific user's order history, one for general
campaigns.

**Options Considered:**
- Option A: Single coupon type — simpler, matches the minimum spec
- Option B: Dual coupon types — USER_SPECIFIC (nth-order reward, bound to one user) and GLOBAL (admin campaign, usable by anyone), with separate discount tiers

**Choice:** Option B — dual types with `CouponType = 'USER_SPECIFIC' | 'GLOBAL'`

**Why:** The two types have fundamentally different redemption rules. USER_SPECIFIC coupons check `coupon.userId === requestingUserId` at checkout — a global coupon doesn't. USER_SPECIFIC are earned (10% off ₹1500+); GLOBAL are issued as campaigns (TIER1: 7.5% off ₹1500+, TIER2: 10% off ₹2000+). Merging them into one type would require nullable fields and conditional logic at every validation point. Keeping them separate makes each path explicit and independently testable.

Redemption state is tracked via `redeemedBy: string[]` rather than `isUsed: boolean`. I initially modelled it as a boolean — it works fine for USER_SPECIFIC coupons, which are single-use regardless of who redeems them. The problem is GLOBAL coupons: a boolean marks the coupon as spent the moment the first user redeems it, blocking everyone else. The array lets USER_SPECIFIC check `length > 0` and GLOBAL check `.includes(userId)` — both rules expressed through one field, no second entity required. In production this maps to a `coupon_redemptions(coupon_code, user_id, redeemed_at)` table with a unique constraint on `(coupon_code, user_id)`.

---

## Decision 5: EventEmitter Fan-out for Post-Order Side Effects

After a checkout completes, two things need to happen: generate a coupon if the user
hit a milestone, and log analytics. If these are written inline in `CheckoutUseCase`,
every new post-order action requires modifying checkout logic — a violation of the
Open/Closed Principle.

**Options Considered:**
- Option A: Inline in CheckoutUseCase — simple, but every new side effect requires modifying checkout
- Option B: Node.js EventEmitter fan-out — CheckoutUseCase emits `order.placed`; handlers react independently
- Option C: Message queue (SQS/RabbitMQ) — correct for distributed systems; over-engineered for an in-memory exercise

**Choice:** Option B — typed EventEmitter singleton

**Why:** `CheckoutUseCase` emits `order.placed` and its responsibility ends there. `CouponHandler` and `AnalyticsHandler` listen independently — adding a new post-order behaviour (confirmation email, data warehouse push) means writing a new handler and calling `registerHandler()` at startup. CheckoutUseCase never changes. Handler failures do not roll back the order — fire-and-forget semantics are correct here because a failed coupon generation is not a reason to undo a completed payment. The `TypedEventBus` is constructor-injected with a default, so tests can pass a spy bus without touching module-level state.

---

## Decision 6: Typed Errors with HTTP Status Codes Baked In

API errors need to carry both a message and an HTTP status code. The two common approaches are: check the error type in the handler and map to a status, or encode the status in the error class itself. String-matching error messages at the handler level is fragile and scatters mapping logic across every controller.

The implementation uses typed error classes extending `AppError`. Each subclass sets its own HTTP status in the constructor — `InsufficientStockError` throws 400, not-found variants throw 404 — so the global error handler is a single `instanceof AppError` check with no mapping table. Adding a new business rule violation means writing one new class; the handler never changes. Each subclass is independently testable: `expect(() => ...).toThrow(InsufficientStockError)` reads exactly like the requirement it covers.

One non-obvious detail: `Object.setPrototypeOf(this, new.target.prototype)` in the `AppError` base class. TypeScript extending built-in `Error` breaks `instanceof` checks under ES5 transpilation — without this line, `catch (e) { if (e instanceof InsufficientStockError)` always falls through to the generic handler. It is documented in the TypeScript handbook but easy to miss and hard to trace when it surfaces in production.

---

## Decision 7: Known Limitations and the Production Path for Each

An in-memory, single-process implementation makes trade-offs that are acceptable for
this exercise but would be incorrect in a production InsurTech system handling real
payments and inventory. These are worth naming explicitly rather than leaving them as
unmarked landmines.

**Limitation 1: Synchronous EventEmitter (not true fan-out)**

`EventBus.emit()` uses Node.js `EventEmitter`, which is synchronous. When `CheckoutUseCase` calls `eventBus.emit('order.placed', ...)`, the `CouponHandler` and `AnalyticsHandler` run on the same event loop tick before `execute()` returns. A slow or throwing handler adds latency to the checkout response — the opposite of the fire-and-forget semantics the architecture intends.

Production fix: `CheckoutUseCase` publishes an `order.placed` message to SQS or Kafka. Handlers become independent worker services consuming from the queue. The `TypedEventBus` interface is unchanged — only the implementation swaps.

**Limitation 2: No inventory mutex (race condition on last unit)**

`store.products` is a plain `Map`. Under concurrent load, two requests can both pass the stock check (`product.stock >= quantity`) before either decrements — overselling the last unit. Node.js is single-threaded so this cannot happen within one process, but any multi-instance deployment reintroduces the race.

Production fix: Stock check and decrement must be atomic. Options: Redis `DECRBY` with a guard, or Postgres `UPDATE products SET stock = stock - $qty WHERE id = $id AND stock >= $qty RETURNING id` — if zero rows updated, reject the checkout.

**Limitation 3: No authentication or authorisation**

All routes are open. `userId` is taken from the URL parameter — any caller can place orders or view stats for any user. In production, `userId` must come from a verified JWT claim, not client input.

Production fix: An Express middleware validates the token on every request and sets `req.user`. Controllers read `req.user.id` instead of `req.params.userId`. Admin routes (`/api/admin/*`) require an additional `role: admin` claim check. Zero domain or use-case changes required — auth lives entirely at the interface layer.

**Limitation 4: Floating-point money**

All monetary values are stored as TypeScript `number` (IEEE 754 double). `0.1 + 0.2 = 0.30000000000000004`. The `roundMoney()` helper prevents drift from appearing in API responses but does not fix intermediate arithmetic. For an in-memory assignment with no persistence this is acceptable.

Production fix: store all amounts as integer paise (₹2999.00 → 299900). Arithmetic on integers is exact; convert to decimal only at the JSON serialisation layer. This is a `BIGINT` column in Postgres — the standard for monetary values in financial databases, and a requirement for SOC2 Type II audit trails.

---

## Decision 8: Read-Only Preview Endpoint Instead of Two-Write Checkout

A common question in checkout design: should coupon application be a separate step from order placement — "apply coupon → confirm checkout" rather than "checkout with optional coupon"? A two-step flow makes the UI easier to build but introduces intermediate state that must be managed between calls.

**Options Considered:**
- Option A: Single `POST /checkout/:userId` — atomic; coupon validated and consumed in the same transaction as order creation; no intermediate state
- Option B: Two-write flow — `POST /checkout/:userId/apply-coupon` mutates a "pending discount" on the cart, then `POST /checkout/:userId` finalises; requires rollback if the second call never arrives
- Option C: Single checkout + read-only preview — `POST /checkout/:userId/preview` runs all validations and returns the price breakdown without mutating anything; the actual checkout remains a single atomic write

**Choice:** Option C — single atomic checkout + read-only preview

**Why:** The two-write approach (Option B) creates a reservation window where a coupon is "consumed" but no order exists yet. If the user closes the tab, the coupon is spent with nothing to show for it. Rolling that back requires TTLs, background jobs, or explicit cancel calls — substantial complexity with no user-visible benefit. The preview endpoint achieves the same UI goal — show the user their discounted total before they click "Pay Now" — with zero side effects. The coupon is validated but `redeemedBy` is not written. The checkout call remains the single source of truth. Shopify's draft order API and Stripe's PaymentIntent `amount_preview` follow this same pattern: read-only validation that doesn't advance state.

---

## Decision 9: Idempotency — Checkout Request Replay

The current implementation has no guard against duplicate checkout requests. A mobile retry or a user double-tapping "Pay Now" creates two orders, decrements stock twice, and may consume the same coupon twice. This is a known gap, not an oversight.

The correct production fix is a client-supplied `Idempotency-Key` header (a UUID generated before the first attempt). The server stores the checkout result in Redis under that key with a 24-hour TTL — a duplicate request within the window gets the cached response without re-executing. This is a pure interface-layer concern: `CheckoutController` reads the header and checks Redis before delegating to the use case. No domain changes required. Stripe and Razorpay both mandate this pattern on their payment endpoints for exactly this reason.

The reason it isn't implemented here is that an in-memory idempotency cache would give false confidence. It would handle duplicate requests within one process lifetime, but idempotency exists to protect against restarts and retries *across* restarts — which is exactly the failure mode an in-memory implementation cannot reproduce. A fake implementation that looks correct and fails in the specific scenario it's designed for is worse than no implementation and a clear note.
