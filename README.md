# Blink Watcher

A privacy-first web app that uses your webcam to count how many times you blink. All face tracking runs locally in your browser using [MediaPipe Face Landmarker](https://developers.google.com/mediapipe/solutions/vision/face_landmarker).

## Features

- Real-time webcam face tracking
- Automatic blink counting
- Live eye-closure score
- Adjustable sensitivity threshold
- Face landmark overlay
- Start / Stop / Reset controls
- All processing happens on-device — no video is uploaded

## Run locally

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev
```

Open the URL shown in your terminal (usually `http://localhost:5173`).

## Build for production

```bash
npm run build
```

This outputs a single-file production build at `dist/index.html` (thanks to `vite-plugin-singlefile`). You can deploy that file to any static host.

## Deploy online

Because the production build is a single static HTML file, you can deploy it almost anywhere. Pick one of the options below.

---

### Option 1: Vercel (recommended, fastest)

1. **Push this project to a GitHub repository.**

2. **Install Vercel CLI** (optional, but convenient):
   ```bash
   npm i -g vercel
   ```

3. **Run the deploy command** from the project folder:
   ```bash
   vercel --prod
   ```
   Vercel will detect Vite automatically and deploy `dist/`.

   Alternatively, import the GitHub repo on [vercel.com](https://vercel.com):
   - Click **Add New Project**
   - Import your repo
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Output directory: `dist`
   - Click **Deploy**

4. Your app will be live at a URL like `https://blink-watcher-xyz.vercel.app`.

---

### Option 2: Netlify

1. **Push this project to a GitHub repository.**

2. **Option A — drag & drop:**
   - Run `npm run build`
   - Go to [netlify.com](https://netlify.com)
   - Drag the `dist` folder onto the Netlify dashboard
   - Your site is live instantly

3. **Option B — Git integration:**
   - On Netlify, click **Add new site > Import an existing project**
   - Choose your Git provider and repo
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Click **Deploy site**

---

### Option 3: GitHub Pages

1. **Push this project to a GitHub repository.**

2. **If your repo is named `yourusername.github.io`**, no extra path configuration is needed.

   **If your repo is named something else** (e.g. `blink-watcher`), edit `vite.config.ts` and add a `base` path:
   ```ts
   export default defineConfig({
     base: '/blink-watcher/', // <- use your repo name
     plugins: [react(), tailwindcss(), viteSingleFile()],
     // ...
   });
   ```

3. A GitHub Actions workflow is included in `.github/workflows/deploy.yml`. It will:
   - Build the project on every push to `main`
   - Upload `dist/` to GitHub Pages

4. Enable GitHub Pages in your repo:
   - Go to **Settings > Pages**
   - Source: **GitHub Actions**

5. Push to `main`. The workflow will run and your site will be live at:
   - `https://yourusername.github.io` (for user/org site)
   - `https://yourusername.github.io/blink-watcher` (for project site)

---

### Option 4: Cloudflare Pages

1. **Push this project to a GitHub repository.**
2. Go to [dash.cloudflare.com](https://dash.cloudflare.com) > **Pages** > **Create a project**
3. Connect your GitHub repo
4. Build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
5. Click **Save and Deploy**

---

### Option 5: Any static file host ( simplest )

Run:

```bash
npm run build
```

Then upload the generated `dist/index.html` file to any static host:

- [Surge](https://surge.sh): `npx surge dist`
- [Render Static Sites](https://render.com)
- [AWS S3 + CloudFront](https://aws.amazon.com/s3/)
- [Firebase Hosting](https://firebase.google.com/docs/hosting)
- Your own web server / VPS

## Tech stack

- React 19
- Vite 7
- Tailwind CSS 4
- MediaPipe Tasks Vision
- TypeScript

## Privacy

The app uses the webcam only for local analysis. No video, image, or biometric data is sent to any server.
