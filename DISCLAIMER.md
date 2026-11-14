# Fingerprint Inspector: Disclaimer and Terms of Use

*Effective November 14, 2026*

Fingerprint Inspector ("the extension") is a free, open-source browser extension by David Feuling (DHF Media) that shows what a web browser reveals to websites and which fingerprinting-related browser features a web page uses. By installing or using the extension, or the website and files that distribute it, you agree to these terms. If you do not agree, do not install or use it.

## 1. Not professional advice

The extension and its documentation are for general education and personal curiosity only. Nothing it shows, and nothing in its reports or documentation, is legal, security, privacy, compliance or technical advice. For decisions that matter (legal compliance, security assessments, privacy obligations, disputes), consult a qualified professional.

## 2. Accuracy and limitations

Results are **estimates**, and they can be incomplete or wrong.

- **Ratings are rough guides.** Labels such as "very identifying," "narrows you down," "strong" and "weak" are based on general public research about browser fingerprinting. They are not measurements of how unique your browser actually is, which would require comparison with a large population of browsers.
- **The stable ID is local.** The ID shown by the extension is a hash calculated on your own computer from the values it collects. It is not the same ID any particular website calculates, and two different sites may see you differently.
- **False positives.** The extension flags the *use* of browser features, and those features have many ordinary purposes.
- **False negatives.** Some fingerprinting can go undetected, including code running in web workers, code that obtains unmodified browser functions before the extension loads, techniques the extension does not watch, and anything done on a website's servers.
- **Results vary** with browser, version, operating system, hardware, settings, other extensions, network conditions, and the moment a page was inspected. A report reflects one browser at one point in time.
- **The WebRTC test** only reports what your browser revealed during that test, from the extension's context. It does not prove that any connection, VPN or proxy is or is not secure.

## 3. Detections are not accusations

A detection means a web page used certain browser features while you visited it. It does **not** mean the website is tracking you, identifying you, violating any law or policy, or doing anything wrong. Many legitimate services use these features for fraud prevention, bot and abuse defense, account security, accessibility, performance and page layout. Scripts may also come from third parties the website does not control.

Do not present the extension's results or reports as proof of wrongdoing by any person, company or website.

## 4. Acceptable use

You agree to:

- Use the extension only on browsers and devices that you own or are authorized to test.
- Comply with all applicable laws and regulations and with the terms of service of websites you visit.
- Not use the extension, its code, or its results to track, identify, profile, harass or surveil any other person; to evade, attack or interfere with security, anti-fraud or anti-abuse systems; or for any unlawful purpose.

If you build on the code (it is open source under the MIT License), you alone are responsible for how your version collects, uses and discloses information, including any notice, consent or other obligations under privacy laws such as the GDPR, the UK GDPR, the ePrivacy Directive, the CCPA/CPRA and similar laws.

## 5. Website compatibility

To observe fingerprinting, the extension wraps certain browser functions inside web pages. These wrappers pass calls through unchanged, but some websites may detect browser extensions, behave differently, show extra verification steps, treat your visit as automated, restrict features, or fail to work correctly. If a site misbehaves, disable the extension for that site or remove it. You are responsible for any effect its use has on your accounts, transactions or online activity.

## 6. Privacy

The extension does not collect, transmit, sell or share your data. See [PRIVACY.md](PRIVACY.md) for details, including the one optional network request (the WebRTC test) and what saved reports contain.

## 7. No warranty

THE EXTENSION, ITS SOURCE CODE, ITS DOCUMENTATION AND THE WEBSITE DISTRIBUTING IT ARE PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, ACCURACY, NON-INFRINGEMENT, AND UNINTERRUPTED OR ERROR-FREE OPERATION. Updates, support and continued availability are not guaranteed.

## 8. Limitation of liability

TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL THE AUTHOR OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY OR PUNITIVE DAMAGES, OR ANY LOSS OF DATA, PROFITS, ACCESS, ACCOUNTS OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH THE INSTALLATION, USE OR INABILITY TO USE THE EXTENSION, RELIANCE ON ITS RESULTS, WEBSITE MALFUNCTIONS, OR ANY SHARING OF ITS REPORTS, WHETHER IN CONTRACT, TORT (INCLUDING NEGLIGENCE) OR OTHERWISE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.

Some jurisdictions do not allow certain warranty exclusions or liability limits, so some of the above may not apply to you. In that case, they apply to the fullest extent permitted.

## 9. Your responsibility

You use the extension at your own risk and are solely responsible for how you use it and its results. To the extent permitted by law, you agree to hold harmless the author and contributors from claims arising from your use or misuse of the extension, your violation of these terms, or your violation of any law or third-party right.

## 10. Third parties

Browser, company and product names mentioned (including Google, Chrome, Microsoft, Edge, Mozilla, Firefox, Brave, Opera and Vivaldi) are trademarks of their respective owners. The extension is an independent project and is not affiliated with, endorsed by or sponsored by any of them or by any website it inspects. Links to outside resources are provided for convenience and are not endorsements.

## 11. Changes

These terms may be updated. The current version is published at https://davidfeuling.com/fingerprint-inspector/ and in the project repository. If the terms shown in the extension change, it will ask you to accept them again.

## 12. Contact

Questions or problems: dhf91@proton.me
