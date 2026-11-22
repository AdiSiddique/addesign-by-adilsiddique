# Super Admin setup — one-time steps

Your site is still the same fast static site. This just adds a small backend
(Vercel Functions + Postgres + Blob storage) so `/admin.html` can manage it
live, with no local build step.

## 1. Attach storage to your Vercel project
Vercel's own native Postgres product was retired (Dec 2024) — Postgres on
Vercel now comes from **Neon**, added through the Vercel Marketplace. The
button wording varies by account, so look for any of these in your project's
**Storage** tab: **"Create Database"**, **"Browse Marketplace"**, or an
**"Add"** button next to Storage.

1. From whichever one appears, choose **Neon** / **Neon Serverless Postgres**
   (not Prisma Postgres or another option — this project's code expects a
   plain Postgres connection string). Pick any nearby region, accept the
   defaults. This sets `DATABASE_URL` automatically in your project's
   environment variables — you don't type it in yourself.
2. Separately, **Create Store → Blob**. Newer Blob stores authenticate
   automatically (OIDC + `BLOB_STORE_ID`) instead of a long-lived token -
   you'll see `BLOB_STORE_ID` and `BLOB_WEBHOOK_PUBLIC_KEY` appear in your
   project's environment variables. Nothing further to do.

Both are free on small usage tiers.

## 2. Run the schema once
After the database is created, there's usually an **"Open in Neon"** button
on the Storage tab — click it, then use the **SQL Editor** in the Neon
console. (Some accounts instead show a **Query** tab directly in Vercel —
either works.) Paste the contents of `sql/schema.sql` → Run.

## 3. Set your login
Generate two values and add them in **Settings → Environment Variables**:

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# -> paste as AUTH_SECRET

node -e "console.log(require('crypto').createHash('sha256').update('YOUR-PASSWORD-HERE').digest('hex'))"
# -> paste as ADMIN_PASSWORD_HASH  (use your own password in the command above)
```

Your real password is never stored — only its hash.

## 4. Deploy
```
npm install
vercel --prod
```
(or push to GitHub if this project is git-connected — either way, make sure
`.vercelignore` no longer excludes `package.json`/`package-lock.json`, and
`vercel.json`'s `installCommand` is `"npm install"` — both already fixed in
this delivery, just don't re-ignore them later.)

## 5. Bring your existing content into the database (one time)
Your current `content/` folders aren't touched automatically — they were the
old local-build workflow. To migrate them in:
```
vercel env pull .env.development.local
npm run db:migrate
```
This uploads the existing images to Blob and creates matching rows in
Postgres, publishing them immediately. Sample folders (`sample-...`) are
skipped — delete them first if you haven't already.

## 6. Log in
Visit `yoursite.vercel.app/admin.html` and sign in with the password from
step 3.

## Fix these two placeholders
I guessed your production URL as `https://addesign-porfolio.vercel.app`
(from the project name in your README) in two places — replace it with your
real domain if different:
- `public/robots.txt` (the `Sitemap:` line)
- `public/index.html` (canonical / og:url / og:image tags)

## What still uses the old workflow
- `npm run dev` (local preview via `npx serve public`) still reads the old
  static `public/data/*.json` files, not the database. For a true local
  preview of the live data, use `vercel dev` instead once env vars are set.
- `build.js` / `npm run go` still work exactly as before if you ever want to
  bulk-import via the `content/` folder again — nothing about that workflow
  was removed, the admin panel is just a second way in now.

## Known limitations (good next steps, not done in this pass)
- The homepage hero tagline is still static HTML — Settings saves the value
  but a small edit to `index.html`/`app.js` is needed to actually read it.
- The site navbar (`public/js/config.js`) doesn't yet hide categories you
  toggle off in Pages — the category's own page/feed does correctly 404 /
  go empty, but the nav link stays visible until clicked.
- Removing an image in the admin form drops it from the item, but doesn't
  delete the file from Blob storage (harmless orphaned storage, not a bug).
- Uploads are resized in the browser before sending (to stay under Vercel's
  4.5MB request limit), which covers normal photos/renders comfortably.
  Very large source files (.psd, .ai, big .zip bundles) should keep using
  the "Download link" field pointing at Google Drive/Gumroad, same as your
  old `info.txt` workflow already did.
