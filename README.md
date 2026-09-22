# BiteDash — Agentic GenAI Food Marketplace & Delivery Platform

**BiteDash** is a modern, full-stack food delivery and marketplace platform powered by an **Agentic GenAI Assistant**. Unlike conventional support chatbots that return canned strings, BiteDash Copilot is a true reasoning agent that uses **OpenAI Function/Tool Calling** to interact with real backend APIs, manage live shopping carts, calculate verified discounts, calculate dynamic multi-variable ETAs, and safely prepare orders for checkout.

---

## 1. System Architecture

```
                                 BiteDash User
                         (Web / Mobile Responsive UI)
                                       │
                                       ▼
                             React Copilot Interface
                    (Action Badges, Food Cards, Cart Sync)
                                       │
                                       ▼
                              Node.js / Express
                        JWT Auth Middleware (req.user)
                                       │
                                       ▼
                            GenAI Agent Dispatcher
                                       │
              ┌────────────────────────┴────────────────────────┐
              ▼                                                 ▼
       OpenAI Tool Calling                             Deterministic Engine
      (gpt-4o-mini / tools)                       (Rule & Intent Pattern Fallback)
              │                                                 │
              └────────────────────────┬────────────────────────┘
                                       ▼
                          Authenticated Backend Tools
            ┌──────────────────────────┼──────────────────────────┐
            ▼                          ▼                          ▼
     Restaurant Tools              Cart Tools                Order Tools
      - searchRestaurants          - getCart                  - getOrderHistory
      - searchMenuItems            - addToCart                - getOrderDetails
      - getRestaurantDetails       - removeFromCart           - getOrderStatus
      - getMenu                    - updateCartQuantity       - getOrderETA (Dynamic)
      - getFoodItemDetails         - clearCart                - reorderPreviousOrder
                                   - getAvailableCoupons      - createOrder (Safety)
                                   - applyCoupon              - initiatePayment
                                   - calculateCartTotal       - getUserPreferences
            │                          │                          │
            ▼                          ▼                          ▼
         MongoDB                     Redis                     MongoDB
      (Restaurants,               (Cart/Coupon              (Orders, Anomaly,
        MenuItems)                   Cache)                    Addresses)
                                       │                          │
                                       ▼                          ▼
                                 Socket.io Room            RabbitMQ Event
                               (user:id, cart sync)      (order_events_queue)
```

---

## 2. Agent Tools & Capabilities

The agent reasoning layer is exposed to 21 strictly-scoped backend tools with JSON Schema validation:

| Tool Name | Scope | Description |
| :--- | :--- | :--- |
| `searchRestaurants` | Discovery | Discovers open restaurants filtered by cuisine, rating, and address. |
| `searchMenuItems` | Discovery | Searches dishes across menus by keyword and price constraints (e.g. *under ₹300*). |
| `getRestaurantDetails` | Discovery | Returns operational state, prep time, reliability score, and location. |
| `getMenu` | Discovery | Fetches complete itemized food menu for a given restaurant. |
| `getFoodItemDetails` | Discovery | Retrieves pricing, availability, and description of a dish. |
| `getCart` | Cart | Fetches the authenticated customer's live cart with real calculations. |
| `addToCart` | Cart | Adds dishes to the user's cart; enforces single-restaurant cart rules. |
| `removeFromCart` | Cart | Removes a dish or cart record. |
| `updateCartQuantity` | Cart | Modifies quantity (0 removes item). |
| `clearCart` | Cart | Completely empties user cart and clears applied coupons. |
| `getAvailableCoupons` | Offers | Lists eligible coupons (`WELCOME50`, `BITEDASH20`, `FEAST100`, `FREEDEL`). |
| `applyCoupon` | Offers | Validates minimum order constraints and locks in real savings. |
| `calculateCartTotal` | Offers | Authoritative subtotal, delivery fee, platform fee, discount, and total calculation. |
| `getOrderHistory` | Orders | Retrieves past orders belonging strictly to `req.user._id`. |
| `getOrderDetails` | Orders | Itemized receipt, delivery address, stage, and rider assignment. |
| `getOrderStatus` | Orders | Real-time stage (`placed`, `accepted`, `preparing`, `ready_for_rider`, `delivered`). |
| `getOrderETA` | Tracking | Dynamic ETA factoring kitchen queue, prep time, distance, and traffic. |
| `reorderPreviousOrder` | Reorder | Re-adds verified available dishes from a previous order into the cart. |
| `createOrder` | Checkout | Safely creates order in MongoDB; **requires explicit customer confirmation**. |
| `initiatePayment` | Payment | Initiates Razorpay payment parameters without exposing payment secrets. |
| `getUserPreferences` | Taste | Retrieves user culinary preferences and past favorite cuisines. |

---

## 3. Tool Calling Flow & Safety Boundary

```
User Query ("Find me a chicken biryani under 300")
       │
       ▼
JWT Validation (Bearer Token → req.user._id)
       │
       ▼
Agent Service invokes OpenAI Tool Calling (tools schema attached)
       │
       ▼
OpenAI selects tool: searchMenuItems({ query: "chicken biryani", maxPrice: 300 })
       │
       ▼
Schema & Parameter Validation
       │
       ▼
Backend Executor executes query against MongoDB (with isAvailable: true)
       │
       ▼
Structured Output & FoodCards attached
       │
       ▼
Model synthesizes final conversational reply with rich interactive UI cards
```

### Security Guarantees:
- **Zero Identity Spoofing**: `userId` is **never** accepted as an argument from the LLM. It is strictly injected from `req.user._id`.
- **Zero Payment Secrets in LLM**: Payment gateway secrets, API keys, and raw card details are never passed to the LLM context.
- **Authoritative Calculations**: The LLM never invents discounts or totals. All math is performed server-side by `calculateCartTotal`.

---

## 4. Checkout Safety Flow

For financially significant actions, BiteDash enforces explicit user confirmation:

```
User: "Place my order."
       │
       ▼
Agent compiles exact summary:
"Here is your final order summary:
 • 2 × Classic Cheeseburger — ₹498
 • Subtotal: ₹498
 • Coupon (BITEDASH20): -₹100
 • Delivery Fee: FREE
 • Platform Fee: ₹7
 Total Payable: ₹405
 Would you like me to place the order? Please reply 'Yes' or 'Confirm'."
       │
       ▼
[User confirms: "Yes, place it"]
       │
       ▼
Agent invokes createOrder({ paymentMethod: "cod", confirmed: true })
       │
       ▼
Order #BD1024 placed! Cart cleared, RabbitMQ event published.
```

---

## 5. Intelligent Multi-Variable ETA Integration

BiteDash integrates the existing intelligent dynamic ETA engine (`services/restaurant/src/services/etaService.js`):

$$\text{ETA} = \text{Food Prep Time} + \text{Kitchen Queue Delay} + \text{Rider Travel Time} + \text{Additional Buffers} - \text{Elapsed Time}$$

- **Kitchen Queue Delay**: $\approx 2.5\text{ mins}$ per active pending order in the restaurant's queue.
- **Rider Travel Time**: Distance-based calculation multiplied by time-of-day traffic factors (Lunch rush: 1.25x, Dinner rush: 1.30x).
- **Conversational Explanation**: When a user asks *"Why is my order taking longer?"*, the agent inspects the telemetry breakdown and explains honestly (e.g. *"Your restaurant is currently handling 6 orders in its kitchen queue, adding 15 minutes of prep time"*).

---

## 6. Deterministic Fallback Strategy

To ensure **100% platform availability**, BiteDash includes a **Deterministic Backend Execution Engine**:

```
Request Received
       │
       ▼
OpenAI Available & Configured?
  ├── Yes ──► OpenAI Function Calling Loop
  └── No / Error / Timeout ──► Deterministic Rule & Intent Engine
                                      │
                                      ▼
                      Identifies intent (Search / Cart / ETA / Coupon / Checkout)
                                      │
                                      ▼
                      Executes the EXACT same backend tools
                                      │
                                      ▼
                      Returns friendly response + Interactive Cards
```

The customer experience is completely seamless even if the OpenAI API is unreachable or rate-limited.

---

## 7. Example End-to-End Conversation

```text
User: "I'm hungry. Find me a burger under ₹300."
Agent: "Here are popular dishes matching 'burger' under ₹300 you can order right now:"
[FoodCard: Classic Cheeseburger - ₹249 - Burger Bistro]

User: "Add that to my cart."
Agent: "Done! I've added 1 × Classic Cheeseburger (₹249) to your cart. Total is now ₹305."
[CartCard: 1 × Classic Cheeseburger, Subtotal: ₹249, Delivery: ₹49, Platform: ₹7, Total: ₹305]

User: "Do I have any discount coupons?"
Agent: "🎟️ Available BiteDash Offers:
• WELCOME50: Flat ₹50 OFF on orders above ₹199 (Eligible)
• BITEDASH20: 20% OFF up to ₹100 on orders above ₹249 (Eligible)
• FEAST100: Flat ₹100 OFF on orders above ₹499 (Need ₹250 more)"

User: "Apply the best coupon."
Agent: "🎉 Coupon 'WELCOME50' applied! You saved ₹50. New total: ₹255."

User: "Place my order."
Agent: "📋 Order Checkout Summary (Burger Bistro)
• 1 × Classic Cheeseburger — ₹249
• Subtotal: ₹249
• Coupon Discount: -₹50
• Delivery Fee: ₹49
• Platform Fee: ₹7
Total Payable: ₹255

Would you like me to place the order? Please reply 'Yes' or 'Confirm' to proceed."

User: "Yes."
Agent: "🎉 Order #BD3F8A has been placed successfully! Estimated arrival: 28 minutes."
[OrderCard: Order #BD3F8A - PLACED - ETA: 28 mins]
```

---

## 8. Environment Variables

Configure the following in `services/restaurant/.env` (or through your deployment environment):

```env
PORT=5001
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/<dbname>
JWT_SEC=your_jwt_secret_token_here
INTERNAL_SERVICE_KEY=your_internal_service_key

# Redis Endpoint (Used for cart/coupon caching and rate limiting)
REDIS_URL=redis://127.0.0.1:6379

# RabbitMQ Message Broker Endpoint (Optional / Persistent events)
RABBITMQ_URL=amqp://admin:admin123@localhost:5672

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
```

---

## 9. Running Locally

### 1. Start Services
```bash
# Terminal 1: Auth Service
cd services/auth && npm run dev

# Terminal 2: Restaurant & Agent Service
cd services/restaurant && npm run dev

# Terminal 3: Realtime Socket Service
cd services/realtime && npm run dev

# Terminal 4: Frontend Web App
cd frontend && npm run dev
```

### 2. Access the Application
Open `http://localhost:5173` in your browser. Click **AI Copilot** in the navigation bar or the floating action pill in the bottom right corner to start ordering food via conversation!
