# Fingerprint Inspector: Privacy Policy

*Effective November 14, 2026 (updated for v1.2.2)*

**Short version: Fingerprint Inspector is designed to keep everything it records in your browser on your computer, and is not designed to collect or send your data.** The only server it is designed to contact is Google's STUN server, during the optional WebRTC test, and only when you click "Run test."

## No guarantees: please read

Fingerprint Inspector is a hobby project that was **vibecoded** (built with AI-assisted coding) and has **not been independently security-audited**. This policy describes how the extension is *designed* to work and how it behaved in the author's own testing. It cannot rule out bugs, including **unforeseen data leaks or privacy problems**, in your browser, version or setup. You install and use it **entirely at your own risk**, and the author accepts no liability for any outcome, including any exposure or loss of data. See the [Disclaimer](DISCLAIMER.md). If you find a problem, please report it to dhf91@proton.me.

## What the extension stores, and where

| Data | Where it's kept | How long |
|---|---|---|
| For each open tab: the page's address (with any `?query` or `#fragment` removed), the fingerprinting techniques seen, how often, and the addresses of the scripts that used them (also with query strings removed) | Your browser's session storage for the extension | Cleared when the tab closes or the browser quits |
| Snapshots you choose to save (the site's name and the fingerprint values shown on the My fingerprint tab) | Your browser's local storage for the extension, on this device only (not synced) | Until you delete them or remove the extension |
| Whether you accepted the terms, and when | Your browser's local storage for the extension | Until you remove the extension |

The extension is not designed to transmit any of this to the author or anyone else. It has no accounts, analytics, telemetry, ads, trackers, update checks or remote servers.

## Network requests

The extension is **not designed to make network requests on its own**. The one intended exception only happens when you ask for it:

- **WebRTC IP leak test.** Clicking "Run test" contacts Google's public STUN server (`stun.l.google.com`, port 19302). As with any WebRTC connection, that server sees your public IP address, and Google's handling of it is governed by Google's privacy policy. Like any WebRTC check, it may also send standard local-network discovery traffic (mDNS) on your own network. The results are shown only to you.

Other details:

- **Font checks are designed to avoid downloads.** When checking which fonts are installed, the extension skips any font name the website supplies as its own web font, because measuring such a font would make the browser download it. Those fonts are listed as "not checked on this site."
- **Links you click** (such as the Disclaimer link in the extension) open web pages the same way any link does.
- **Your browser's own features**, such as sync, download scanning or crash reporting, behave according to your browser's settings and its own privacy policy. The extension doesn't use or change them.

## What websites are meant to see

- The extension is **designed not to pass data to websites**. Its internal reports travel over a private channel set up before a page's own scripts run, which is meant to keep the page from reading them.
- To observe fingerprinting, the extension wraps certain browser functions inside each page. It doesn't change what pages show you or the results those functions return, but a determined website may be able to tell that a function was wrapped and infer that an extension like this is installed. See section 5 of the [Disclaimer](DISCLAIMER.md).

## Permissions and why they're needed

- **Read data on all websites** (content scripts on all sites): needed to watch which browser features each page uses and to gather your fingerprint as websites would see it. The extension reads browser and device properties, the page's address, and which scripts call the watched features. It is not designed to read page text, form contents, passwords, cookies or your browsing history.
- **Storage:** to keep the tab results, snapshots and terms acceptance described above.
- **Downloads:** to save PNG reports and JSON exports to your Downloads folder when you ask it to.

## Reports and exports

PNG reports and JSON exports are created on your computer and saved only where you put them. They can contain details about your browser and device (such as your user agent, graphics card, screen size, timezone, languages and installed fonts), the sites and script addresses you inspected, and, if you ran the WebRTC test, IP addresses. **Review and redact them before sharing publicly.**

## The website

The download page at davidfeuling.com is hosted on GitHub Pages. GitHub may log technical information about visits (such as IP addresses) under the [GitHub Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement). The page itself is built without cookies, analytics, trackers, or third-party fonts or scripts, and its donation QR codes are drawn in your browser rather than fetched from a server.

## Removing your data

Delete snapshots from the Snapshots tab, or remove the extension from your browser to erase everything it stored.

## Children

The extension is not directed at children and is not designed to collect personal information from anyone.

## Changes and contact

Updates to this policy are published with the project at https://davidfeuling.com/fingerprint-inspector/. Questions: dhf91@proton.me
