# Deploy NR_ICE_SPICE to Render

This project is configured as one Render Node web service. It serves the React app, Express API, and Socket.IO from the same HTTPS origin.

## Before deploying

1. Push the project to a GitHub, GitLab, or Bitbucket repository. Do not commit `server/.env` or any credentials.
2. In MongoDB Atlas, create a database user with a strong password and access limited to the cafe database.
3. Configure Atlas Network Access for Render. Prefer a static outbound IP allowlist where available; otherwise follow Atlas's current guidance for Render-hosted services.
4. Choose a unique production admin username and use a password with at least 12 characters.

## Create the Render service

1. In Render, choose **New → Blueprint** and connect the repository containing `render.yaml`.
2. Review the `nr-ice-spice` web service and create it.
3. Enter the prompted secret/environment values:
   - `MONGO_URI`: the Atlas URI for the production database, with URL-encoded credentials if needed.
   - `ADMIN_NAME`, `ADMIN_USERNAME`, `ADMIN_EMAIL`: production administrator details.
   - `ADMIN_PASSWORD`: a unique password of at least 12 characters. Do not reuse the local demo password.
4. Render generates `JWT_SECRET` automatically. Keep it private.
5. Wait for the build and deploy to finish. Confirm the Render health check at `/api/health` succeeds.

The service builds the Vite client and serves it from Express. API requests use `/api`, and Socket.IO connects to the same origin; no separate frontend URL configuration is required.

## Production account behavior

On each server start in production, the configured administrator's password is synchronized from `ADMIN_PASSWORD`. The default seeded `cashier` and `kitchen` demo accounts are disabled in production. Add real staff accounts before operating the cafe.

The seeded menu and categories are sample data. Review and replace them before taking real orders. Verify the configured UPI ID and test payment receipt independently; the app does not verify bank transfers automatically.

## Local development

Local development remains available with `npm run dev`. The local server may use the in-memory MongoDB fallback only when `NODE_ENV` is not `production`.
