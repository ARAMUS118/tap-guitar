# Tap Guitar v2 — iPhone-ready mobile browser MVP

Zero-cost React + TypeScript + Vite application. No backend. The two original demo WAV stems are included in `public/`. There is NO account, server upload, or external music API.

## What changed from v1

- The entire black screen is an input surface; there is no visible tap button.
- Tap briefly: guitar goes to 100%, stays there 1 second, then fades over 1 second.
- Hold down: guitar stays at 100% for the duration of the hold. After releasing, the 1-second hold then 1-second fade begins. Both timings are adjustable.
- Touch creates expanding colored sparks and wave rings; holding creates a glowing pulsing background.
- Play/pause stays at top right; all other features live in the ⋮ settings drawer.
- Manual activation delay from 0 to 1000 ms.
- Track stems start on exactly the same Web Audio `AudioContext` clock timestamp and with the same playback offset. Guitar track is always running and is gated with a GainNode; it never restarts when tapped.
- Future planned: record reference tapping timings, a single-lane note track, and mistap penalties (NOT implemented).

## Windows local setup

1. Install Node.js LTS: https://nodejs.org/ and Visual Studio Code: https://code.visualstudio.com/.
2. Unzip into a folder. Open that folder in VS Code.
3. In **Terminal > New Terminal** run:

   ```powershell
   npm install
   npm run dev
   ```

4. Open the terminal's `http://localhost:5173/` URL in your PC browser.
5. The demo loads automatically. Click ▶ (top right) to start, then tap/hold any empty part of the screen.
6. Click ⋮ to load your own matched backing and guitar WAV files or adjust the timing.

## Easiest iPhone setup — GitHub Pages, free

1. Sign into https://github.com, create a PUBLIC repository, name it `tap-guitar` (any name works), and do **not** initialize with README.
2. In VS Code open **Terminal > New Terminal** from your project folder and run:

   ```powershell
   git init
   git add .
   git commit -m "Tap Guitar v2"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/tap-guitar.git
   git push -u origin main
   ```

   Replace `YOUR_USERNAME` with your real GitHub username. If git is not installed, get it at https://git-scm.com/download/win. GitHub may ask you to authenticate in a browser. Alternatively create the repository and upload the project files through GitHub's web interface, preserving `public/`, `src/`, and `.github/workflows/` paths.
3. In the repository open **Settings > Pages > Build and deployment > Source > GitHub Actions**.
4. Go to the **Actions** tab, open `Publish Tap Guitar`, and wait for the green deployment check. You may need to click **Run workflow** if it hasn't run yet.
5. On the iPhone open `https://YOUR_USERNAME.github.io/tap-guitar/` in **Safari**. Tap ▶ to unlock audio, then tap or hold the black screen.
6. Optional: Safari Share → Add to Home Screen; this gives it an app-like launch icon without an App Store account.
7. Connect the iPhone to Bluetooth car audio *while parked*. Listen for timing lag. Adjust the timing slider in ⋮ as needed; **positive delay delays guitar activation**, and cannot magically remove car output lag.

**GitHub repository must be public for this simple free GitHub Pages approach.** Only upload audio you created or are authorized to publicly share. Demo stems are original, so they're safe to include.

## Alternative: test iPhone on same Wi-Fi without GitHub

Start `npm run dev` on Windows. Run `ipconfig`, look for the PC's Wi-Fi IPv4 address, e.g. `192.168.1.25`, then open `http://192.168.1.25:5173/` in iPhone Safari. Phone and PC must be on same Wi-Fi; your Windows firewall may need to allow Node.js. For reliable phone testing from outside home, use the HTTPS GitHub Pages method above.

## Import real song stems

Make two synchronized audio files, both beginning at exactly 0:00, same tempo and length:
- Backing: everything except the guitar.
- Guitar: only the guitar.

Use ⋮ → file pickers → Load selected audio. WAV is recommended for the first test. The files are decoded locally in the browser and aren't sent to a server. Alternatively replace `public/demo-backing.wav` and `public/demo-guitar.wav` with properly aligned files and redeploy for immediate demo loading; keep your original demo stems saved elsewhere. Large WAV files take memory on iPhones, so try clips under 60 seconds first.

## Important caveats

- **iOS audio unlock:** hit ▶ after loading. Mobile Safari usually blocks autoplay and the AudioContext must be resumed by a user gesture.
- **Bluetooth delay:** every system has different output latency. Manual delay schedules tap-triggered gain *later*; it cannot make tap-triggered sound arrive earlier. For true Bluetooth compensation with a visual note lane, future versions need forward-scheduled note events or delay/buffering strategies.
- **Foreground only:** iOS may pause/suspend Web Audio when Safari backgrounds or the screen locks. Keep it open and screen awake.
- **Driving safety:** test as a passenger or when parked; repeated screen interaction is not safe while driving.
- **Song rights:** avoid pushing commercial copyrighted stems into a public GitHub repository without permission.
- **Build troubleshooting:** If `npm run build` reports a TypeScript error, copy the output. This package was prepared without access to the npm registry for a full installation/build test in this environment.

## Cost

VS Code, Node.js, Vite, React, GitHub repository, and GitHub Pages public repo deployment are available without a fee under their respective terms.
