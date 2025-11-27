# Pawan Krishna Tours & Travells (Static Site)

This is a static website intended for deployment on Vercel.

## Structure
- `home.html` (root landing page)
- `trip.html` and destination pages under `indiandestinations/` and `internationaldestinations/`
- `static/` contains assets like CSS/JS/images
- `vercel.json` routes `/` to `/home.html`

## Deploy via GitHub → Vercel
1. Initialize git and push to GitHub (repo under your account):
```powershell
git init
git checkout -b main
git add .
git commit -m "Initialize site for Vercel (static)"
# create a repo on GitHub named e.g. travel-site and then:
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```
2. In Vercel Dashboard: New Project → Import your GitHub repo → Deploy
3. Add your custom domain later in Project → Settings → Domains

## Notes
- No build step required; Vercel serves static files directly.
- `vercel.json` ensures `/` resolves to `home.html`.
