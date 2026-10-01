# Deploying GL-WRF Climatology Explorer

The site has two independent parts:

| Part | Where | What | Updated by |
|---|---|---|---|
| **Data** | Cloudflare R2 bucket `gl-wrf-data`, public via its `r2.dev` URL | `v1/catalog.json` + five Zarr stores (~16 MB, 586 files) | you, with `preprocess/upload.sh` |
| **Site** | GitHub Pages: https://aaron-bartlett.github.io/GLWRF-climatology/ | the built Vite/React app | GitHub Actions on every push to `main` |

The site finds the data through one build setting, the repository variable `DATA_BASE_URL`.

Do Part A (data) first, then Part B (site). Total time: about 30 minutes.

---

## Before you start

- A **GitHub** account (`aaron-bartlett`).
- A **Cloudflare** account. R2 needs a payment method on file, but this project stays inside the free tier: 16 MB of the 10 GB storage allowance, and about 3 reads per map view.
- On this Mac: `git` and `rclone` are already installed (`/opt/homebrew/bin`). The conda env `gl-wrf` and `npm install` are already set up.

The cropped grids (7 boundary cells removed from each edge, 131×160 native cells) are already built into `preprocess/out/v1`. To rebuild and re-check them at any time:

```bash
cd "/Users/aaron/Documents/GL-WRF Website/preprocess"
conda run -n gl-wrf python build_stores.py
conda run -n gl-wrf pytest -q          # all tests must pass before uploading
```

---

## Part A: Data on Cloudflare R2

### A1. Create the bucket
1. Go to the Cloudflare dashboard → **R2 Object Storage**. On first use, accept the R2 plan, which needs a payment method.
2. **Recommended:** go to **Manage Account → Billing → Notifications** and add a usage alert, so any usage beyond the free tier is noticed.
3. Click **Create bucket** and fill in:
   - Name: `gl-wrf-data`
   - Location: Automatic
   - Storage class: Standard

### A2. Turn on public read access
1. Open the bucket → **Settings** → **Public Development URL** → **Enable** (type `allow` to confirm).
2. Copy the URL it shows, e.g. `https://pub-0123456789abcdef.r2.dev`. **This is your `DATA_BASE_URL`.** You'll need it in A6 and B4.

### A3. Add the CORS policy
The browser loads data from `r2.dev` while the page comes from `github.io`. CORS is what allows that.
1. In the same **Settings** page, go to **CORS Policy** → **Add CORS policy** (or **Edit**).
2. Paste the contents of `preprocess/r2-cors.json` and save. It allows:
   - `https://aaron-bartlett.github.io`, the live site
   - `localhost:5173` and `localhost:4173`, for local testing against R2

### A4. Create an API token for uploads
1. Go to **R2 Object Storage** → **Manage API tokens** → **Create API token**.
2. Set it up:
   - Permissions: **Object Read & Write**
   - Specify bucket(s): **Apply to specific buckets only** → `gl-wrf-data`
   - TTL: Forever (or your choice)
3. Create it, then copy three values:
   - **Access Key ID**
   - **Secret Access Key** (it is shown only once)
   - The S3 endpoint, `https://<account-id>.r2.cloudflarestorage.com`

> These are the only secrets in the whole setup. Keep them in rclone's config only. Never put them in the repo, a `.env` file, or a chat.

### A5. Configure rclone (one time)
Run the interactive setup in your own terminal, so the secret doesn't end up in shell history:

```bash
rclone config
```

Answer the prompts as follows:

| Prompt | Answer |
|---|---|
| New remote, name | `r2` |
| Storage | `s3` (Amazon S3 Compliant Storage Providers) |
| Provider | `Cloudflare` |
| env_auth | `false` |
| access_key_id / secret_access_key | the values from A4 |
| region | `auto` |
| endpoint | `https://<account-id>.r2.cloudflarestorage.com` |
| acl | `private` (public access is the r2.dev URL, not object ACLs) |
| Edit advanced config | `y`, then set **no_check_bucket = true** (needed because the token is scoped to one bucket); accept the defaults for everything else |

Check it works:

```bash
rclone lsd r2:gl-wrf-data      # an empty listing (no error) means the remote is good
```

### A6. Upload
```bash
cd "/Users/aaron/Documents/GL-WRF Website"
preprocess/upload.sh            # = preprocess/upload.sh r2 gl-wrf-data
```

The script uploads each version folder in two passes:
1. **Data chunks** are mirrored with `Cache-Control: public, max-age=31536000, immutable`. Stale chunks are deleted from the bucket.
2. **`catalog.json` and the Zarr metadata** (`.zmetadata`, `.zarray`, `.zattrs`, `.zgroup`) get `Cache-Control: public, max-age=300`.

It should report 410 chunks plus 176 metadata files.

### A7. Check the data is public and CORS-enabled
Replace `pub-…` with your URL:

```bash
curl -sI -H "Origin: https://aaron-bartlett.github.io" https://pub-….r2.dev/v1/catalog.json
curl -sI https://pub-….r2.dev/v1/historical.zarr/mean_T2/0.0.0
```

| Request | Expected headers |
|---|---|
| `catalog.json` | `HTTP/2 200`, `content-type: application/json`, `cache-control: public, max-age=300`, `access-control-allow-origin: https://aaron-bartlett.github.io` |
| `0.0.0` chunk | `HTTP/2 200`, `cache-control: public, max-age=31536000, immutable` |

---

## Part B: Site on GitHub Pages

The local repository is already initialized with a first commit on `main`. `.gitignore` keeps the following out of git:
- NetCDF files, the `.tar.gz` archive, and `preprocess/out/`
- `node_modules/` and `dist/`
- `.env` files
- the local `.claude/` tooling

### B1. Create the GitHub repository
On github.com, go to **New repository** and fill in:
- Owner `aaron-bartlett`, name **`GLWRF-climatology`**
- **Public** (GitHub Pages on a free plan needs a public repo)
- Do **not** add a README, license or .gitignore. The repo must start empty.

### B2. Push
```bash
cd "/Users/aaron/Documents/GL-WRF Website"
git remote add origin https://github.com/aaron-bartlett/GLWRF-climatology.git
git push -u origin main
```

If git asks you to sign in, either use the browser sign-in it offers, or install the GitHub CLI once (`brew install gh && gh auth login`) and push again.

### B3. Turn on Pages
Go to the repo → **Settings → Pages → Build and deployment → Source: GitHub Actions**.

### B4. Tell the build where the data is
Go to the repo → **Settings → Secrets and variables → Actions → Variables** tab → **New repository variable**:
- Name: `DATA_BASE_URL`
- Value: your r2.dev URL from A2, e.g. `https://pub-0123456789abcdef.r2.dev`. Leave off the trailing slash and the `/v1`.

It's a variable rather than a secret because the URL is public anyway.

### B5. Deploy
1. Go to the repo → **Actions** → **Deploy to GitHub Pages**.
2. The run started by your push (B2) has probably failed with "Set the DATA_BASE_URL repository variable". Click **Run workflow** (or **Re-run all jobs**).
3. The workflow then does, in order:
   - `npm ci`
   - `npm test`
   - a build with the page path `/GLWRF-climatology/`, taken from the repo name
   - publishing `dist/`

### B6. Check the live site
Open **https://aaron-bartlett.github.io/GLWRF-climatology/** and check:
- The map, data overlay, colorbar and caption appear. The default view is Mean temperature (2 m), January, Historical.
- Switching variable, month and scenario updates the map. Hover shows values.
- Copy the URL, open it in a new tab, and you get the same view.

---

## Updating later

| Change | What to do |
|---|---|
| **Code or UI** | Commit and push to `main`. The site redeploys automatically in about 1 minute. |
| **Data, before anyone else uses the site** | Rebuild, test, then run `preprocess/upload.sh`. Hard-reload your own browser, because chunks are cached for a year. |
| **Data, after the site is public** | Publish under a new version so nobody sees stale cached chunks. See the steps below. |

To publish data under a new version:
1. Set `VERSION = "v2"` in `preprocess/build_stores.py`.
2. Change `/v1/catalog.json` to `/v2/catalog.json` in `src/data/catalog.ts`.
3. Rebuild and test, then run `preprocess/upload.sh`. It uploads `v2/` next to `v1/`.
4. Push the code change.
5. Once the new site is live, remove the old version: `rclone purge r2:gl-wrf-data/v1`.

**Moving off r2.dev later** (a custom domain is recommended for heavy traffic, since r2.dev is rate-limited):
1. Go to the bucket → **Settings → Custom Domains** and connect a domain managed in Cloudflare.
2. Change `DATA_BASE_URL` to the new domain.
3. Re-run the workflow.

The CORS policy doesn't change, because it lists the site's origin, not the data's.

---

## Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| Page says "Couldn't load the dataset catalog" | `DATA_BASE_URL` is wrong (typo, trailing slash, or `/v1` included), or the upload didn't happen. Open `<DATA_BASE_URL>/v1/catalog.json` in a browser; it must show JSON. |
| Browser console shows a **CORS** error | The R2 CORS policy is missing, or the origin doesn't match exactly. It must be `https://aaron-bartlett.github.io`, with no path and no trailing slash. CORS changes can take a minute to apply. |
| Workflow fails at "Check DATA_BASE_URL is set" | Add the repository variable (B4), then re-run. |
| Workflow fails at `npm test` | A frontend test broke. Run `npm test` locally, fix, and push. |
| Site loads but the page is blank, with 404s for `/assets/...` | Pages isn't set to **GitHub Actions** (B3), or the site was built for a different repo name. The page path comes from the repo name, so renaming the repo is fine. Just re-run the workflow. |
| Map tiles missing but the data overlay shows | The basemap comes from OpenFreeMap. Check https://tiles.openfreemap.org is reachable. Background tabs also pause map drawing until you return to them. |
| `rclone` says AccessDenied or bucket errors | Re-check the token is scoped to `gl-wrf-data` with Object Read & Write, and that `no_check_bucket = true` is set (A5). |
