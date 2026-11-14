# Fingerprint Inspector: Privacy Policy

*Effective November 14, 2026*

**Short version: Fingerprint Inspector collects nothing and sends nothing anywhere.** Everything it records stays in your browser on your computer.

## What the extension stores, and where

| Data | Where it's kept | How long |
|---|---|---|
| Fingerprinting activity seen on each tab | Your browser's session storage for the extension | Cleared when the tab closes or the browser quits |
| Snapshots you choose to save | Your browser's local storage for the extension | Until you delete them or remove the extension |
| Whether you accepted the terms, and when | Your browser's local storage for the extension | Until you remove the extension |

None of this is transmitted to the author or anyone else. There are no accounts, analytics, telemetry, ads, trackers or remote servers.

## Network requests

The extension makes **no network requests** except one, and only when you click it:

- **WebRTC IP leak test.** Clicking "Run test" contacts Google's public STUN server (`stun.l.google.com`, port 19302). As with any WebRTC connection, that server sees your public IP address. Google's handling of that connection is governed by Google's own privacy policy. The results are shown only to you.

## Permissions and why they're needed

- **Read data on all websites** (content scripts on all sites): needed to watch which browser features each page uses and to gather your fingerprint as websites would see it. The extension reads browser and device properties and records feature usage. It does not read page text, form contents, passwords, cookies or browsing history, and it does not modify page content.
- **Storage:** to keep the tab results, snapshots and terms acceptance described above.
- **Downloads:** to save PNG reports and JSON exports to your Downloads folder when you ask it to.

## Reports and exports

PNG reports and JSON exports are created on your computer and saved only where you put them. They can contain details about your browser and device, such as your user agent, graphics card, screen size, timezone, languages, installed fonts and, if you ran the WebRTC test, IP addresses. **Review and redact them before sharing publicly.**

## The website

The download page at davidfeuling.com is hosted on GitHub Pages. GitHub may log technical information about visits (such as IP addresses) under the [GitHub Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement). The page itself uses no cookies, analytics, trackers or third-party fonts or scripts.

## Removing your data

Delete snapshots from the Snapshots tab, or remove the extension from your browser to erase everything it stored.

## Children

The extension is not directed at children and collects no personal information from anyone.

## Changes and contact

Updates to this policy are published with the project at https://davidfeuling.com/fingerprint-inspector/. Questions: dhf91@proton.me
