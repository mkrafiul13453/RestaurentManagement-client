# Restora client

## Local setup

1. Use Node.js 20.9 or newer (Node.js 24 LTS is recommended) and npm.
2. Copy `.env.example` to `.env.local`.
3. Keep `NEXT_PUBLIC_API_URL=http://localhost:5000` for local development. For Stripe Test Mode Checkout, set `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to your Stripe test publishable key in `.env.local`.
4. Run `npm install`, then `npm run dev`. Open `http://localhost:3000`.

The client uses the server origin for both Better Auth and `/api/v1` calls. Do not put `BETTER_AUTH_SECRET`, `MONGODB_URI`, or any other server credential in this repository. Sign-up creates a customer account; role assignment is controlled by the server.

Customers can pay their own orders with Stripe Checkout and view payment history under **My orders**. Admin, manager, and cashier dashboards have a Payments page for payment history, checkout cancellation, and confirmed full-refund requests.
