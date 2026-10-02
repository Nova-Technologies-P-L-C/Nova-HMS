// =============================================================================
// Nova HMS — Express HTTP Server
// =============================================================================
//
// This is the main backend entry point. It boots an Express server that
// handles two distinct route namespaces:
//
//   /api/auth/*  — Better Auth session management (login, logout, session check)
//   /trpc/*      — tRPC API router (all clinical data operations)
//
// Port: 3000 (hardcoded; configure via env var for production deployments)
//
// Architecture:
//   Express (HTTP transport)
//     └── CORS middleware (restricts cross-origin requests to the Next.js frontend)
//     └── /api/auth  (Better Auth — email+password sessions via HTTP-only cookies)
//     └── /trpc      (tRPC batch handler — all clinical API calls)
//     └── GET /      (health-check endpoint for load balancers and uptime monitors)
//
// Multi-tenancy:
//   The `x-tenant-id` header is the key that scopes every tRPC request to a
//   specific hospital. It must be listed in `allowedHeaders` for the CORS
//   preflight to pass — missing this caused a common dev issue in early builds.
//
// Security:
//   - CORS is configured to allow only the trusted frontend origin (env.CORS_ORIGIN)
//   - credentials: true allows the session cookie to be sent cross-origin
//   - Better Auth routes are mounted BEFORE tRPC to avoid middleware order issues
//
// Production checklist:
//   - Replace hardcoded port 3000 with process.env.PORT
//   - Set CORS_ORIGIN to the production hospital domain (e.g. https://dmrh.novahms.et)
//   - Add a process manager (PM2 / systemd) for auto-restart on crash
//   - Enable HTTPS termination via a reverse proxy (Nginx / Caddy)
//   - Switch SQLite datasource to PostgreSQL in packages/db/prisma/schema/schema.prisma
// =============================================================================

import { createContext } from "@my-better-t-app/api/context";
import { appRouter } from "@my-better-t-app/api/routers/index";
import { auth } from "@my-better-t-app/auth";
import { env } from "@my-better-t-app/env/server";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";

const app = express();

// ── CORS Middleware ────────────────────────────────────────────────────────
// Restricts browser requests to the trusted Next.js frontend origin.
// credentials: true is required for the Better Auth session cookie to be
// included in cross-origin fetch requests made by the frontend.
//
// allowedHeaders MUST include "x-tenant-id" — this custom header is the
// multi-tenancy key injected by the frontend on every tRPC call after login.
app.use(
  cors({
    origin: env.CORS_ORIGIN,                              // e.g. http://localhost:3001 (dev)
    methods: ["GET", "POST", "OPTIONS"],                  // tRPC uses POST; OPTIONS for preflight
    allowedHeaders: ["Content-Type", "Authorization", "x-tenant-id"],
    credentials: true,                                    // Required for cookie-based auth
  }),
);

// ── Better Auth Routes: /api/auth/* ───────────────────────────────────────
// Mounts all Better Auth endpoints under /api/auth/.
// This includes:
//   POST /api/auth/sign-in/email     — Login with email + password
//   POST /api/auth/sign-out          — Logout and clear session cookie
//   GET  /api/auth/get-session       — Validate current session (used by tRPC context)
//
// toNodeHandler() adapts Better Auth's Web API handler to Node.js http.IncomingMessage.
// Must be registered BEFORE express.json() to avoid body parsing conflicts.
app.all("/api/auth{/*path}", toNodeHandler(auth));

// ── tRPC API Routes: /trpc/* ───────────────────────────────────────────────
// Mounts the full tRPC router under /trpc/.
// All clinical operations (patients, visits, billing, lab, pharmacy, etc.)
// are handled here as type-safe remote procedure calls.
//
// createContext() runs on every request to:
//   1. Validate the session cookie
//   2. Extract the x-tenant-id header
//   3. Resolve the user's role in that tenant
//
// The frontend calls these as batched requests, e.g.:
//   GET /trpc/patient.search?batch=1&input={"0":{"query":"Tigist"}}
app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,       // Full tRPC router tree (all routers merged in routers/index.ts)
    createContext,           // Per-request auth + tenant context factory
  }),
);

// express.json() is placed AFTER Better Auth to avoid interfering with
// Better Auth's own body parsing. Only needed for any raw JSON REST endpoints
// added in the future.
app.use(express.json());

// ── Health Check ──────────────────────────────────────────────────────────
// Simple liveness endpoint for load balancers, uptime monitors, and Docker
// health checks. Returns 200 OK with a plain text body.
// Does NOT check database connectivity — add a /health/db route for that.
app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

// ── Start Server ──────────────────────────────────────────────────────────
// Listens on all interfaces (0.0.0.0) — necessary inside Docker containers.
// In production, this port should be hidden behind a reverse proxy (Nginx)
// that handles SSL termination and serves the Next.js app on port 443.
app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
