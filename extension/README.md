# Fingerprint Inspector

A browser extension that shows:

1. **This site:** which fingerprinting techniques the page you're on actually uses, how often, and which scripts made the calls (including third-party scripts and iframes).
2. **My fingerprint:** what your browser gives away to any website, grouped and rated by how identifying each value is, rolled up into a single "stable ID".
3. **Snapshots:** saved fingerprints from different situations, with a side-by-side comparison of exactly what changed.

It's designed to keep everything in your browser's local extension storage and not to send data anywhere. The only server it's designed to contact is Google's STUN server, during the optional WebRTC leak test, which runs only when you click it.

> **Important:** This is a vibecoded hobby project (built with AI-assisted coding) that has not been independently security-audited, so it may contain bugs, including unforeseen data leaks or privacy problems. Use it entirely at your own risk; the author accepts no liability. Results are estimates, not proof, and can be incomplete or wrong. A detection shows which browser features a page used, not why; many uses are legitimate. Use it only on browsers and devices you own or are allowed to test. Provided as-is with no warranty. You'll be asked to accept the full terms in [DISCLAIMER.md](DISCLAIMER.md) on first use. Privacy details: [PRIVACY.md](PRIVACY.md).

## Install

Unzip the folder somewhere permanent first. The browser loads it from that location, so don't delete it afterward.

**Chrome, Edge, Brave, Opera, Vivaldi**
1. Go to `chrome://extensions` (Edge: `edge://extensions`, Brave: `brave://extensions`).
2. Turn on **Developer mode** (top right, or bottom left in Edge).
3. Click **Load unpacked** and choose the `fingerprint-inspector` folder (the one containing `manifest.json`).
4. Pin it: click the puzzle-piece icon in the toolbar, then the pin next to Fingerprint Inspector.
5. To use it in private windows: open the extension's **Details** and turn on **Allow in Incognito** (Brave: **Allow in Private**).

**Firefox (version 128 or newer)**
1. Go to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on** and pick `manifest.json` inside the folder.
3. Firefox removes temporary add-ons when it closes, so repeat these steps after each restart.

## Use

- **Reload any page you want to inspect after installing.** Detection only starts on pages loaded while the extension is running.
- The **toolbar badge** shows how many strong fingerprinting techniques the current page used.
- **Pop out** opens the popup in a bigger window, which helps with the comparison table.
- **Save PNG report** (top right of each tab) saves a full-length image report straight to your Downloads folder, with every collapsed section expanded and the buttons left out:
  - *This site:* every technique the page used, with all the scripts and frames behind each one.
  - *My fingerprint:* the stable ID and every value, plus WebRTC results if you ran that test.
  - *Snapshots:* the list of all snapshots, the comparison (if you clicked Compare), and the full values of any ticked snapshots. Tick the ones you want included before saving.
  - Files are named like `fingerprint-inspector_example.com_site-report_2026-11-14_1600.png`.
- Browser pages (settings, new tab, extension stores) are off-limits to extensions and can't be inspected.

## Experiments worth running

Save a snapshot with a clear label in each situation, then compare them.

| Compare | What you'll learn |
|---|---|
| Two different sites, same browser | If the stable ID matches, those sites could link your visits without cookies. |
| Normal window vs. private window | Private mode clears cookies but usually leaves your fingerprint unchanged. |
| VPN off vs. VPN on | A VPN changes your IP but not your fingerprint. Also run the WebRTC test with the VPN on. |
| Chrome vs. Brave vs. Firefox | Brave randomizes canvas and audio per site and session; you'll see "randomized" flags. |
| Firefox normal vs. Strict tracking protection or `privacy.resistFingerprinting` | Which values get flattened to common defaults. |
| Same browser, a different monitor or zoom level | How much screen size and pixel ratio move your ID. |

Busy news and shopping sites tend to light up the badge more than personal sites.

## How it works

- `detector.js` runs inside each page before the site's own code and wraps the browser features fingerprinters use (canvas readback, WebGL, audio contexts, font measuring, device lists, and so on). Each call is counted and traced back to the script that made it. Sites still get normal, unchanged results.
- `relay.js` passes those reports to `background.js`, which keeps a running tally per tab and sets the badge.
- `collector.js` gathers your fingerprint on demand, using the same techniques a tracking script would.
- `welcome.html` / `welcome.js` open once after installing to show the terms and quick-start steps.
- `popup.html` / `popup.js` / `popup.css` make up the interface, including the PNG reports (drawn by the browser itself, no outside libraries). `shared.js` holds the hashing and the "strong vs. weak" rules.

## Limits to know about

- **Vibecoded and unaudited.** Built with AI-assisted coding and not reviewed by a security professional. Unforeseen bugs, including data leaks, are possible.

- **"Very identifying" is a rough guide, not a measurement.** Real uniqueness depends on how many other people share your values, which needs a large database. For that comparison, also try https://coveryourtracks.eff.org and https://amiunique.org.
- **Some fingerprinting can slip past detection:** scripts running in web workers, and tricks that grab untouched browser functions from a fresh iframe before the extension is injected.
- **Weak signals have innocent uses.** Reading screen size or timezone is normal for layouts and clocks. The "strong" label marks patterns that are rarely needed for anything except identification.
- **Video-call sites** legitimately use WebRTC and device lists, so expect strong signals there.

## Disclaimer, privacy and license

- [DISCLAIMER.md](DISCLAIMER.md): terms of use, accuracy limits, no warranty, limitation of liability.
- [PRIVACY.md](PRIVACY.md): what is stored and where, the one intended network request, and why each permission is needed.
- [LICENSE](LICENSE): MIT License. Copyright (c) 2026 David Feuling.

Not affiliated with or endorsed by Google, Microsoft, Mozilla, Brave, Opera, Vivaldi, the EFF, AmIUnique or any website the extension inspects. Product names are trademarks of their respective owners.

Contact: dhf91@proton.me
