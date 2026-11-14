// welcome.js - opens once after install: shows the terms, then quick-start steps.

const api = globalThis.browser ?? globalThis.chrome;
const box = document.getElementById("welcome");

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") node.className = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c != null) node.append(c instanceof Node ? c : String(c));
  return node;
}

function showSteps() {
  box.replaceChildren(el("div", { class: "terms" },
    el("h2", { class: "terms-title" }, "You're all set"),
    el("ol", {},
      el("li", {}, "Pin the extension: click the puzzle-piece icon in your toolbar, then the pin next to Fingerprint Inspector."),
      el("li", {}, "Reload any tabs that were already open. Pages only get watched if they load after the extension is running."),
      el("li", {}, "Visit a site and click the icon. The number on the icon shows how many strong fingerprinting signs that page used."),
      el("li", {}, "To use it in private windows, turn on \"Allow in Incognito\" (Brave: \"Allow in Private\") on the extension's Details page.")),
    el("p", { class: "muted" }, "You can close this tab.")));
}

(async () => {
  const { acceptedTerms } = await api.storage.local.get("acceptedTerms");
  if (acceptedTerms === FPI.TERMS_VERSION) return showSteps();
  box.replaceChildren(el("div", { class: "terms" },
    el("h2", { class: "terms-title" }, "Before you use Fingerprint Inspector"),
    el("ul", {}, FPI.TERMS.map(([head, body]) => el("li", {}, el("b", {}, head), " ", body))),
    el("p", { class: "muted" }, "Full terms: ",
      el("a", { href: FPI.DISCLAIMER_URL, target: "_blank", rel: "noopener" }, "Disclaimer & Privacy Policy"),
      " (also included as DISCLAIMER.md and PRIVACY.md in the extension folder)."),
    el("button", {
      onclick: async () => {
        await api.storage.local.set({ acceptedTerms: FPI.TERMS_VERSION, acceptedAt: Date.now() });
        showSteps();
      }
    }, "I understand and agree")));
})();
