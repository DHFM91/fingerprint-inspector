# Fingerprint Inspector: Privacy Policy

*Effective November 14, 2026*

**Short version: Fingerprint Inspector collects nothing and sends nothing anywhere.** Everything it records stays in your browser on your computer. The only time it contacts any server is the optional WebRTC test, and only when you click "Run test."

## What the extension stores, and where

| Data | Where it's kept | How long |
|---|---|---|
| For each open tab: the page's address (with any `?query` or `#fragment` removed), the fingerprinting techniques seen, how often, and the addresses of the scripts that used them (also with query strings removed) | Your browser's session storage for the extension | Cleared when the tab closes or the browser quits |
| Snapshots you choose to save (the site's name and the fingerprint values shown on the My fingerprint tab) | Your browser's local storage for the extension, on this device only (not synced) | Until you delete them or remove the extension |
| Whether you accepted the terms, and when | Your browser's local storage for the extension | Until you remove the extension |

None of this is transmitted to the author or anyone else. There are no accounts, analytics, telemetry, ads, trackers, update checks or remote servers.

## Network requests

The extension's code makes **no network requests on its own**, with one exception that only happens when you ask for it:

- **WebRTC IP leak test.** Clicking "Run test" contacts Google's public STUN server (`stun.l.google.com`, port 19302). As with any WebRTC connection, that server sees your public IP address, and Google's handling of it is governed by Google's privacy policy. Like any WebRTC check, it may also send standard local-network discovery traffic (mDNS) on your own network. The results are shown only to you.

Other details:

- **Font checks never download anything.** When checking which fonts are installed, the extension skips any font name the website supplies as its own web font, because measuring such a font would make the browser download it. Those fonts are listed as "not checked on this site."
- **Links you click** (such as the Disclaimer link in the extension) open web pages the same way any link does.
- **Your browser's own features**, such as sync, download scanning or crash reporting, behave according to your browser's settings and its own privacy policy. The extension doesn't use or change them.

## What websites can and can't see

- Websites receive **no data from the extension**. Its internal reports travel over a private channel that is set up before a page's own scripts run, so the page can't read them.
- To observe fingerprinting, the extension wraps certain browser functions inside each page. It doesn't change what pages show you or the results those functions return, but a determined website may be able to tell that a function was wrapped and infer that an extension like this is installed. See section 5 of the [Disclaimer](DISCLAIMER.md).

## Permissions and why they're needed

- **Read data on all websites** (content scripts on all sites): needed to watch which browser features each page uses and to gather your fingerprint as websites would see it. The extension reads browser and device properties, the page's address, and which scripts call the watched features. It does not read page text, form contents, passwords, cookies or your browsing history.
- **Storage:** to keep the tab results, snapshots and terms acceptance described above.
- **Downloads:** to save PNG reports and JSON exports to your Downloads folder when you ask it to.

## Reports and exports

PNG reports and JSON exports are created on your computer and saved only where you put them. They can contain details about your browser and device (such as your user agent, graphics card, screen size, timezone, languages and installed fonts), the sites and script addresses you inspected, and, if you ran the WebRTC test, IP addresses. **Review and redact them before sharing publicly.**

## The website

The download page at davidfeuling.com is hosted on GitHub Pages. GitHub may log technical information about visits (such as IP addresses) under the [GitHub Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement). The page itself sets no cookies and loads no analytics, trackers, or third-party fonts or scripts. Its donation QR codes are drawn in your browser, not fetched from a server.

## Removing your data

Delete snapshots from the Snapshots tab, or remove the extension from your browser to erase everything it stored.

## Children

The extension is not directed at children and collects no personal information from anyone.

## Changes and contact

Updates to this policy are published with the project at https://davidfeuling.com/fingerprint-inspector/. Questions: dhf91@proton.me
