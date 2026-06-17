# Uniblox E-Commerce API

A RESTful e-commerce backend with cart management, checkout, and an nth-order discount system.
Built with **TypeScript + Node.js + Express** using **Clean Architecture**.

In-memory storage — no database required.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20+ |
| Language | TypeScript (strict mode) |
| Framework | Express.js |
| Events | Node.js EventEmitter (typed) |
| Testing | Jest + ts-jest |
| API Docs | Swagger UI (swagger-jsdoc + swagger-ui-express) |

---

## Architecture

```
src/
├── domain/          ← Pure business logic. Zero external imports.
│   ├── entities/    ← Product, Cart, Order, Coupon, User
│   ├── rules/       ← DiscountRule (nth-order logic, coupon math)
│   └── errors/      ← Typed AppError subclasses with HTTP status codes
├── application/     ← Use cases. One class per business operation.
│   ├── cart/        ← AddToCartUseCase, UpdateCartItemUseCase, RemoveCartItemUseCase
│   ├── checkout/    ← CheckoutUseCase, PreviewCheckoutUseCase
│   └── admin/       ← GenerateCouponUseCase, GetStatsUseCase
├── config/          ← Env-driven configuration (PORT, NTH_ORDER, discount tiers)
├── infrastructure/  ← In-memory store implementing AppStore interface
│   └── store/
├── events/          ← TypedEventBus + post-order handlers (fan-out)
├── utils/           ← Structured JSON logger
└── interfaces/      ← Express routes, controllers, error middleware
    ├── routes/
    ├── controllers/
    └── middleware/
```

Dependencies only point inward — Express, the store, and event handlers are all
swappable without touching business logic.

---

## Setup

```bash
git clone <repo-url>
cd ecommerce
npm install
npm run dev        # starts on http://localhost:3000
```

### Environment Variables

All config has safe defaults. Override via env vars to customise behaviour:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NTH_ORDER` | `5` | Orders per coupon milestone |
| `USER_SPECIFIC_DISCOUNT` | `10` | % discount for nth-order reward |
| `USER_SPECIFIC_MIN_AMOUNT` | `1500` | Minimum cart value for USER_SPECIFIC coupon |
| `GLOBAL_TIER1_DISCOUNT` | `7.5` | % discount for GLOBAL TIER1 |
| `GLOBAL_TIER1_MIN_AMOUNT` | `1500` | Minimum cart value for TIER1 |
| `GLOBAL_TIER2_DISCOUNT` | `10` | % discount for GLOBAL TIER2 |
| `GLOBAL_TIER2_MIN_AMOUNT` | `2000` | Minimum cart value for TIER2 |

```bash
NTH_ORDER=3 npm run dev    # coupon on every 3rd order instead of 5th
```

---

## API Docs

Once the server is running, open:

```
http://localhost:3000/api-docs
```

Swagger UI lists all endpoints with request/response schemas and try-it-out support.

---

## Run Tests

```bash
npm test                 # run all tests
npm run test:coverage    # run with coverage report
```

**79 tests across 7 suites — all passing.**

| Suite | Tests |
|-------|-------|
| DiscountRule | 17 |
| AddToCartUseCase | 9 |
| CheckoutUseCase | 16 |
| GenerateCouponUseCase | 10 |
| UpdateCartItemUseCase | 11 |
| PreviewCheckoutUseCase | 11 |
| GetOrderHistoryUseCase | 5 |

---

## API Reference

### Products

```
GET /api/products
```
Returns all 5 seeded products with current stock levels.

---

### Cart

```
POST /api/cart/:userId/items
Body: { "productId": "p1", "quantity": 2 }
```
Adds item to cart. Validates stock. Snapshots price at add-time (ADD semantics — accumulates quantity).

```
PUT /api/cart/:userId/items/:productId
Body: { "quantity": 3 }
```
Sets the quantity of an existing cart item to an absolute value (SET semantics — not additive).
Pass `quantity: 0` to remove the item. Use this when stock drops and the user needs to reduce their cart.

```
DELETE /api/cart/:userId/items/:productId
```
Removes a specific product from the cart entirely.

```
GET /api/cart/:userId
```
Returns current cart with running total.

---

### Checkout

```
POST /api/checkout/:userId/preview
Body: { "couponCode": "UNIBLOX-XXXXXXXX" }   ← couponCode is optional
```
Read-only checkout preview. Runs all validations (stock, coupon eligibility, minimum amount) and
returns the price breakdown — **without placing an order or consuming the coupon.**

Use this to show users a discount breakdown before they confirm payment.

```
POST /api/checkout/:userId
Body: { "couponCode": "UNIBLOX-XXXXXXXX" }   ← couponCode is optional
```

- Re-validates stock (cart may be stale)
- Validates coupon: exists, not redeemed, user-bound (USER_SPECIFIC), above minimum order amount
- Decrements stock only after all validations pass
- Clears cart after successful order
- Emits `order.placed` event — CouponHandler auto-generates a USER_SPECIFIC coupon on every nth order

Response includes `nextCouponAt` — how many orders until the user earns their next reward.

**Coupon types at checkout:**

| Type | Who can use it | Single-use rule |
|------|---------------|-----------------|
| USER_SPECIFIC | Only the user it was issued to | Single-use globally |
| GLOBAL | Any user | Single-use per user |

---

### Orders

```
GET /api/orders/:userId
```
Returns all orders placed by a user, sorted newest-first, with `totalOrders` and `totalSpend`.
Returns 404 if the user has not placed any orders yet.

This is the user-facing order history endpoint — distinct from `GET /api/admin/stats/:userId`
which is admin-scoped and mixes aggregate stats with order data.

---

### Admin

```
POST /api/admin/coupons/generate
Body: { "type": "USER_SPECIFIC", "userId": "user1" }
Body: { "type": "GLOBAL", "tier": "TIER2" }
```

| Type | Triggered by | Discount |
|------|-------------|----------|
| USER_SPECIFIC | **Auto-generated** by checkout event on every Nth order. This endpoint is a manual override / fallback only. | 10% off ₹1500+ |
| GLOBAL TIER1 | Always manual — admin-triggered campaign | 7.5% off ₹1500+ |
| GLOBAL TIER2 | Always manual — admin-triggered campaign | 10% off ₹2000+ |

For USER_SPECIFIC: after every Nth checkout, a coupon is automatically created by the event handler and appears in `GET /api/admin/coupons` with no admin action needed. The generate endpoint returns `{ success: false, message }` if the user hasn't hit the milestone yet — this is a valid business state, not an error.

```
GET /api/admin/coupons
```
Lists all coupons. `redeemedBy` shows which users have consumed each coupon
(empty array = unused; USER_SPECIFIC max 1 entry; GLOBAL tracks all redeemers).

```
GET /api/admin/stats
```
Store-wide totals: `totalOrders`, `totalItemsPurchased`, `totalRevenue`, `totalDiscountGiven`,
`topSellingProduct` (by units sold), `topRevenueProduct` (by revenue generated), all coupons.

```
GET /api/admin/stats/:userId
```
Per-user stats scoped to one user: order totals, `favoriteProduct` (most purchased item),
full `orders[]` purchase history, and coupons issued to that user.

---

## Seeded Data

### Products
| ID | Name | Price | Stock |
|----|------|-------|-------|
| p1 | Wireless Headphones | ₹2999 | 50 |
| p2 | Mechanical Keyboard | ₹4499 | 30 |
| p3 | USB-C Hub | ₹1799 | 100 |
| p4 | Webcam HD | ₹2499 | 20 |
| p5 | Desk Lamp | ₹1299 | 75 |

### Users
| ID | Name |
|----|------|
| user1 | Naveen Kumar |
| user2 | Keerthana |
| user3 | Rahul |

---

## Happy Path Test Flow

```bash
# 1. Browse products
curl http://localhost:3000/api/products

# 2. Add items to cart
curl -X POST http://localhost:3000/api/cart/user1/items \
  -H "Content-Type: application/json" \
  -d '{"productId":"p1","quantity":2}'

# 3. Preview total with a coupon before committing
curl -X POST http://localhost:3000/api/checkout/user1/preview \
  -H "Content-Type: application/json" \
  -d '{"couponCode":"UNIBLOX-XXXXXXXX"}'

# 4. Checkout (repeat to hit nth-order milestone)
curl -X POST http://localhost:3000/api/checkout/user1 \
  -H "Content-Type: application/json" -d '{}'

# 5. After Nth order, coupon is auto-generated. Fetch it:
curl http://localhost:3000/api/admin/coupons

# 6. Checkout with coupon
curl -X POST http://localhost:3000/api/checkout/user1 \
  -H "Content-Type: application/json" \
  -d '{"couponCode":"UNIBLOX-XXXXXXXX"}'

# 7. Update a cart item quantity (SET, not ADD)
curl -X PUT http://localhost:3000/api/cart/user1/items/p1 \
  -H "Content-Type: application/json" \
  -d '{"quantity":1}'

# 8. Remove an item from cart
curl -X DELETE http://localhost:3000/api/cart/user1/items/p1

# 9. View your own order history (user-facing, not admin)
curl http://localhost:3000/api/orders/user1

# 10. Check admin stats
curl http://localhost:3000/api/admin/stats
curl http://localhost:3000/api/admin/stats/user1
```

Or import `postman/uniblox-ecommerce.json` into Postman and run the collection.

---

## Production Considerations

| Concern | Production Approach |
|---------|-------------------|
| **Auth** | Auth0 or AWS Cognito with JWT middleware on all routes |
| **Persistence** | Redis for cart/session state; Postgres for orders (SOC2 audit trail) |
| **Stock reservation** | Redis SETNX or Postgres SELECT FOR UPDATE — soft-reserve at cart-add, hard-deduct at checkout |
| **Coupon race conditions** | Atomic compare-and-swap (Redis / DB transaction) to prevent double-spend |
| **Payment** | Stripe with idempotency keys; two-phase: reserve → pay → confirm |
| **EventBus** | Replace Node EventEmitter with SQS or Kafka (same TypedEventBus interface, zero domain changes) |
| **Observability** | Structured JSON logs (already in place); OpenTelemetry spans per use case; Datadog for p99 latency |
| **Multi-tenancy** | tenantId on every entity; AppStore interface enforces isolation at the repository layer |
| **Scale** | Stateless Express instances behind an ALB; Redis cluster for shared state |

---

## At Production Scale

How this service fits into a production infrastructure. The Clean Architecture and
`AppStore` interface mean the code changes are minimal — mostly swapping the store
implementation and adding an SQS publisher.

```
Client
  │
  ▼
┌──────────────────────────────────────────────┐
│   API Gateway  (rate limiting · JWT verify)  │
└─────────────────────┬────────────────────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
  ┌───────────────┐       ┌───────────────┐   stateless — scale horizontally
  │  Express #1   │       │  Express #2   │   behind an Application Load Balancer
  └───────┬───────┘       └───────┬───────┘
          └──────────┬────────────┘
                     │
       ┌─────────────┼──────────────┐
       ▼             ▼              ▼
┌────────────┐ ┌───────────┐ ┌───────────┐
│   Redis    │ │ Postgres  │ │    SQS    │
│ · cart     │ │ · orders  │ │ order.    │
│ · sessions │ │ · products│ │ placed    │
│ · idempot. │ │ · coupons │ └─────┬─────┘
│ · counters │ │ (SOC2)    │       │
└────────────┘ └───────────┘  ┌────┴─────────────┐
                               ▼                  ▼
                         CouponWorker    AnalyticsWorker
                         (Lambda/ECS)    (Lambda/ECS)
```

**What changes from this codebase to that diagram:**
- `InMemoryStore` → `RedisStore` + `PostgresStore` (both implement `AppStore` — no domain changes)
- `TypedEventBus.emit()` → publish to SQS (same interface, different implementation)
- `CheckoutController` reads `Idempotency-Key` header, checks Redis before delegating to the use case
- JWT middleware on every route reads `req.user.id` instead of `req.params.userId`
