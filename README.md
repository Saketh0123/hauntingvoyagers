git checkout -b main
git add .
git commit -m "Initialize site for Vercel (static)"
# Haunting Voyagers Travel Platform

Dual deployment setup: Main site + API (root project) and separate Admin panel, both sharing the same MongoDB and Cloudinary resources.

## Repository Structure
- Root static pages: `home.html`, `trip.html`, `tour-detail.html`
- Destinations: `indiandestinations/` & `internationaldestinations/`
- Admin panel: `admin-panel/` (served independently)
- API (serverless Express): `api/` with `server.js` + `index.js` wrapper
- Config: `vercel.json` (root), `admin-panel/vercel.json`

## Serverless API
The Express app in `api/server.js` is exported and wrapped by `serverless-http` in `api/index.js`. Root `vercel.json` routes `/api/(.*)` to the function.

## Environment Variables (add in BOTH Vercel projects)
- `MONGODB_URI` — MongoDB Atlas connection string
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

## Deployment (GitHub → Vercel)
### 1. Push to GitHub
Already pushed to `https://github.com/Saketh0123/hauntingvoyagers`.

### 2. Main Site + API Project
- Import root directory (`/`).
- No build command.
- Clean URLs provided by `vercel.json`.
- API available at: `/api/...`

### 3. Admin Panel Project
- Import again selecting root directory `admin-panel`.
- Uses its own `vercel.json` for clean URLs.
- Points to API via absolute URL (e.g. `https://<main-project>.vercel.app/api`).

### 4. Custom Domains (optional)
- Main: `hauntingvoyagers.com`, `www.hauntingvoyagers.com`
- Admin: `admin.hauntingvoyagers.com`

### 5. Local Development
```powershell
npm install
npm run dev   # Starts Express locally on port 3000
```
Open `home.html` in a browser (or serve with a lightweight static server).

## Common Issues
- CORS: Already enabled with `cors()`; tighten origins if needed.
- Env var changes: Redeploy after updates.
- Large image uploads: If hitting limits, switch to direct Cloudinary upload widgets.

## Updating
Push changes to `main`; Vercel auto-redeploys both projects (if connected) or redeploy manually in dashboard.

## License
Internal project; no public license specified.
