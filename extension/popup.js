// popup.js - the window you see when you click the toolbar icon.

const api = globalThis.browser ?? globalThis.chrome;
const $ = (sel) => document.querySelector(sel);
// Replace an element's contents, skipping empty (null/false) entries.
const fill = (node, ...kids) => node.replaceChildren(...kids.filter((k) => k != null && k !== false));

// Build page elements safely (text is always inserted as text, never as HTML,
// because script URLs and values come from websites).
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") node.className = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) node.setAttribute(k, v === true ? "" : v);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : String(child));
  }
  return node;
}

const params = new URLSearchParams(location.search);
let tabId = null;
let pageHost = "";
let current = null; // the latest collected fingerprint

// ---- Tabs ----------------------------------------------------------------
document.querySelectorAll("nav button").forEach((btn) => {
  btn.addEventListener("click", () => showTab(btn.dataset.tab));
});
function showTab(name) {
  document.querySelectorAll("nav button").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
  for (const id of ["site", "me", "snaps"]) $(`#tab-${id}`).hidden = id !== name;
}

// ---- Terms (must be accepted once before the extension is used) ------------
function termsPanel(onAccept) {
  return el("div", { class: "terms" },
    el("h2", { class: "terms-title" }, "Before you use Fingerprint Inspector"),
    el("ul", {}, FPI.TERMS.map(([head, body]) => el("li", {}, el("b", {}, head), " ", body))),
    el("p", { class: "muted" },
      "Full terms: ",
      el("a", { href: FPI.DISCLAIMER_URL, target: "_blank", rel: "noopener" }, "Disclaimer & Privacy Policy"),
      " (also included as DISCLAIMER.md and PRIVACY.md in the extension folder)."),
    el("button", {
      id: "terms-accept",
      onclick: async () => {
        await api.storage.local.set({ acceptedTerms: FPI.TERMS_VERSION, acceptedAt: Date.now() });
        onAccept();
      }
    }, "I understand and agree")
  );
}

async function termsAccepted() {
  const { acceptedTerms } = await api.storage.local.get("acceptedTerms");
  return acceptedTerms === FPI.TERMS_VERSION;
}

// ---- Startup ---------------------------------------------------------------
(async function init() {
  if (!(await termsAccepted())) {
    document.body.classList.add("needs-terms");
    const gate = termsPanel(() => { gate.remove(); document.body.classList.remove("needs-terms"); start(); });
    document.body.prepend(gate);
    return;
  }
  start();
})();

async function start() {
  if (params.get("tab")) {
    tabId = Number(params.get("tab"));
    document.body.classList.add("wide");
  } else {
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    tabId = tab ? tab.id : null;
  }

  $("#popout").addEventListener("click", () => {
    api.windows.create({ url: api.runtime.getURL(`popup.html?tab=${tabId}`), type: "popup", width: 760, height: 820 });
    window.close();
  });

  renderSite();
  api.storage.onChanged.addListener((changes, area) => {
    if (area === "session" && changes["tab" + tabId]) renderSite();
    if (area === "local" && changes.snapshots) renderSnapshots();
  });
  collect();
  renderSnapshots();
}

// ---- "This site" tab -------------------------------------------------------
function baseDomain(host) {
  // Rough "same site" check: compare the last two parts (example.co.uk is a known miss).
  return host.split(".").slice(-2).join(".");
}
function hostOf(url) {
  try { return new URL(url).hostname; } catch (e) { return ""; }
}

async function renderSite() {
  if (tabId == null) return;
  const stored = (await api.storage.session.get("tab" + tabId))["tab" + tabId];
  const summary = $("#site-summary");
  const list = $("#site-list");
  list.replaceChildren();

  if (!stored) {
    fill(summary, 
      el("div", { class: "big" }, "Not watching this page yet"),
      el("div", { class: "muted" },
        "Reload the page to start watching. Browser pages (settings, new tab, extension stores) can't be inspected.")
    );
    return;
  }

  pageHost = hostOf(stored.url);
  $("#site").textContent = pageHost || stored.url;
  const items = FPI.analyze(stored.techniques);
  const strong = items.filter((t) => t.strong);

  fill(summary, 
    el("div", { class: "big" },
      strong.length ? `${strong.length} strong fingerprinting sign${strong.length === 1 ? "" : "s"}` : "No strong fingerprinting seen"),
    el("div", { class: "muted" },
      `${items.length} technique${items.length === 1 ? "" : "s"} used since the page loaded. ` +
      "Some scripts start late or only after you scroll or click, so the count can grow."),
    el("div", { class: "muted note" },
      "This shows which browser features the page used, not why. Many uses are legitimate (fraud prevention, " +
      "bot defense, layout), so a detection is not proof of tracking or wrongdoing.")
  );

  for (const t of items) {
    const thirdParty = t.scripts.filter((s) => {
      const h = hostOf(s);
      return h && pageHost && baseDomain(h) !== baseDomain(pageHost);
    });
    list.append(el("div", { class: "card" },
      el("h3", {},
        el("span", { class: `tag ${t.strong ? "strong" : "weak"}` }, t.strong ? "strong" : "weak"),
        t.name,
        el("span", { class: "count" }, `${t.count.toLocaleString()} call${t.count === 1 ? "" : "s"}`)
      ),
      el("p", { class: "muted" }, t.about),
      t.details.length ? el("p", { class: "muted" }, "Read: " + t.details.join(", ")) : null,
      t.scripts.length ? el("details", {},
        el("summary", { class: "muted" },
          `Called by ${t.scripts.length} script${t.scripts.length === 1 ? "" : "s"}`,
          thirdParty.length ? " " : "", thirdParty.length ? el("span", { class: "tag third" }, "third-party") : null),
        el("ul", { class: "scripts" }, t.scripts.map((s) => el("li", {}, s))),
        t.frames.length > 1 || (t.frames[0] && hostOf(t.frames[0]) !== pageHost)
          ? el("p", { class: "muted" }, "From frames: " + t.frames.join(", ")) : null
      ) : null
    ));
  }
}

// ---- "My fingerprint" tab --------------------------------------------------
function stableId(fp) {
  const stable = Object.entries(fp.components)
    .filter(([, c]) => !c.volatile)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, c]) => [name, c.value]);
  return FPI.hash(stable);
}

function formatValue(v) {
  if (Array.isArray(v)) return v.length ? v.join(", ") : "(none)";
  if (v && typeof v === "object" && !Object.keys(v).length) return "(none)";
  if (v && typeof v === "object") return Object.entries(v).map(([k, x]) => `${k}: ${Array.isArray(x) ? x.join(", ") : x}`).join("\n");
  return String(v);
}

function valueCell(v) {
  const text = formatValue(v);
  if (text.length <= 90) return el("td", { class: "val" }, text);
  return el("td", { class: "val" },
    el("details", {}, el("summary", {}, text.slice(0, 70) + "…"), el("pre", { style: "white-space:pre-wrap;margin:4px 0 0" }, text)));
}

async function collect() {
  const summary = $("#me-summary");
  try {
    current = await api.tabs.sendMessage(tabId, { type: "collect" }, { frameId: 0 });
  } catch (e) {
    current = null;
  }
  if (!current || current.error) {
    fill(summary, 
      el("div", { class: "big" }, "Can't read this page"),
      el("div", { class: "muted" },
        "Open a normal website (not a browser settings page or extension store). If you just installed or updated the extension, reload the page.")
    );
    $("#snap-save").disabled = true;
    return;
  }

  $("#site").textContent = current.site;
  const id = stableId(current);
  const noise = [];
  if (current.noise.canvas) noise.push("canvas");
  if (current.noise.audio) noise.push("audio");

  fill(summary, 
    el("div", { class: "muted" }, "Your stable ID on this page"),
    el("div", { class: "id" }, FPI.prettyId(id)),
    el("div", { class: "muted" },
      "Built from everything below except values that change in normal use (window size, connection). " +
      "If this ID is the same across sites and sessions, those sites can recognize you without cookies."),
    noise.length
      ? el("div", { class: "warn good" },
          `Anti-fingerprinting detected: ${noise.join(" and ")} results are randomized, so they change on every read. ` +
          "That's your browser protecting you (Brave, Firefox strict mode and some extensions do this).")
      : null,
    el("div", { class: "legend muted" },
      el("span", {}, el("span", { class: "dot high" }), "very identifying"),
      el("span", {}, el("span", { class: "dot medium" }), "narrows you down"),
      el("span", {}, el("span", { class: "dot low" }), "widely shared"))
  );

  $("#me-list").replaceChildren(...componentTables(current.components));
}

// Grouped tables of fingerprint values (used on screen and in snapshot reports).
function componentTables(components) {
  const groups = {};
  for (const [name, comp] of Object.entries(components)) (groups[comp.group] ||= []).push([name, comp]);
  const order = ["Browser", "Hardware", "Screen", "Locale", "Rendering", "Preferences"];
  const rank = (g) => (order.includes(g) ? order.indexOf(g) : order.length);
  return Object.entries(groups).sort(([a], [b]) => rank(a) - rank(b)).flatMap(([group, rows]) => [
    el("h2", {}, group),
    el("table", {}, el("tbody", {}, rows.map(([name, comp]) =>
      el("tr", {},
        el("td", { class: "name" }, el("span", { class: `dot ${comp.weight}` }), name,
          comp.volatile ? el("div", { class: "muted" }, "changes often, not in ID") : null),
        valueCell(comp.value))
    )))
  ]);
}

$("#snap-save").addEventListener("click", async () => {
  if (!current) return;
  const label = $("#snap-label").value.trim() || "Untitled";
  const { snapshots = [] } = await api.storage.local.get("snapshots");
  snapshots.unshift({
    id: Date.now(),
    label,
    site: current.site,
    time: current.time,
    stableId: stableId(current),
    noise: current.noise,
    userAgent: current.components["User agent"] ? current.components["User agent"].value : "",
    components: current.components
  });
  await api.storage.local.set({ snapshots });
  $("#snap-label").value = "";
  const btn = $("#snap-save");
  btn.textContent = "Saved ✓";
  setTimeout(() => (btn.textContent = "Save snapshot"), 1500);
});

// ---- WebRTC leak test --------------------------------------------------------
$("#webrtc-run").addEventListener("click", async () => {
  const out = $("#webrtc-out");
  fill(out, el("p", { class: "muted" }, "Testing…"));
  const found = { local: new Set(), publicIps: new Set() };
  try {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    pc.createDataChannel("probe");
    pc.addEventListener("icecandidate", (e) => {
      if (!e.candidate || !e.candidate.candidate) return;
      const parts = e.candidate.candidate.split(" ");
      const ip = parts[4];
      const type = parts[7];
      if (type === "srflx") found.publicIps.add(ip); else if (type === "host") found.local.add(ip);
    });
    await pc.setLocalDescription(await pc.createOffer());
    await new Promise((res) => {
      const done = () => pc.iceGatheringState === "complete" && res();
      pc.addEventListener("icegatheringstatechange", done);
      setTimeout(res, 5000);
    });
    pc.close();
  } catch (e) {
    fill(out, el("div", { class: "warn good" }, "WebRTC appears to be blocked or disabled in this browser, so this test found no IP addresses."));
    return;
  }

  const local = [...found.local];
  const hidden = local.every((ip) => ip.endsWith(".local"));
  fill(out, 
    el("div", { class: "warn" + (found.publicIps.size ? "" : " good") },
      found.publicIps.size
        ? `Public IP visible through WebRTC: ${[...found.publicIps].join(", ")}. With a VPN on, this should be the VPN's address, not your home one.`
        : "No public IP was revealed through WebRTC."),
    el("div", { class: "warn" + (hidden ? " good" : "") },
      !local.length ? "No local network addresses revealed."
        : hidden ? "Local network address is hidden behind a random name (good)."
        : `Local network addresses visible: ${local.join(", ")}`)
  );
});

// ---- Snapshots tab ---------------------------------------------------------
let selected = [];

async function renderSnapshots() {
  const { snapshots = [] } = await api.storage.local.get("snapshots");
  selected = selected.filter((id) => snapshots.some((s) => s.id === id));
  const list = $("#snap-list");
  list.replaceChildren();
  if (!snapshots.length) {
    list.append(el("div", { class: "card muted" }, "No snapshots yet. Save one from the My fingerprint tab."));
  }
  for (const s of snapshots) {
    list.append(el("div", { class: "card snap" },
      el("input", {
        type: "checkbox", checked: selected.includes(s.id),
        onchange: (e) => {
          selected = e.target.checked ? [...selected, s.id].slice(-2) : selected.filter((x) => x !== s.id);
          renderSnapshots();
        }
      }),
      el("div", { class: "meta" },
        el("b", {}, s.label),
        el("div", { class: "muted" }, `${s.site} • ${new Date(s.time).toLocaleString()}`),
        el("div", { class: "id" }, FPI.prettyId(s.stableId))),
      el("button", {
        class: "ghost danger",
        onclick: async () => {
          const { snapshots: all = [] } = await api.storage.local.get("snapshots");
          await api.storage.local.set({ snapshots: all.filter((x) => x.id !== s.id) });
        }
      }, "Delete")
    ));
  }
  $("#snap-compare").disabled = selected.length !== 2;
  $("#snap-compare").textContent = `Compare selected (${selected.length}/2)`;
}

$("#snap-compare").addEventListener("click", async () => {
  const { snapshots = [] } = await api.storage.local.get("snapshots");
  const [a, b] = selected.map((id) => snapshots.find((s) => s.id === id));
  const out = $("#compare-out");
  if (!a || !b) return;

  const names = [...new Set([...Object.keys(a.components), ...Object.keys(b.components)])];
  const differs = names.filter((n) =>
    JSON.stringify(a.components[n] && a.components[n].value) !== JSON.stringify(b.components[n] && b.components[n].value));
  const val = (s, n) => (s.components[n] ? s.components[n].value : "(missing)");

  fill(out, 
    el("div", { class: "summary" },
      el("div", { class: "big" }, a.stableId === b.stableId ? "Same stable ID" : "Different stable IDs"),
      el("div", { class: "muted" },
        a.stableId === b.stableId
          ? "These two situations look like the same browser to a fingerprinting script."
          : `${differs.length} of ${names.length} values differ between the two.`)),
    differs.length ? el("table", {},
      el("thead", {}, el("tr", {}, el("th", {}, "Value"), el("th", {}, a.label), el("th", {}, b.label))),
      el("tbody", {}, differs.map((n) => el("tr", {},
        el("td", { class: "name" }, n), valueCell(val(a, n)), valueCell(val(b, n)))))
    ) : null
  );
});

$("#snap-export").addEventListener("click", async () => {
  const { snapshots = [] } = await api.storage.local.get("snapshots");
  const blob = new Blob([JSON.stringify(snapshots, null, 2)], { type: "application/json" });
  const a = el("a", { href: URL.createObjectURL(blob), download: `fingerprint-snapshots-${Date.now()}.json` });
  document.body.append(a);
  a.click();
  a.remove();
});

$("#snap-clear").addEventListener("click", async () => {
  if (!confirm("Delete all saved snapshots?")) return;
  await api.storage.local.set({ snapshots: [] });
});

// ---- PNG reports ------------------------------------------------------------
// Each tab can be saved as one tall image. The report is a cleaned-up copy of the
// tab: everything expanded, buttons removed, always in the light theme so it
// prints and reads well. The browser draws it natively (no outside libraries).

const REPORT_WIDTH = 900;

// Make a copy of part of the popup that's suitable for a report.
function reportCopy(node) {
  const copy = node.cloneNode(true);
  copy.removeAttribute("id");
  copy.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
  copy.querySelectorAll("button, input, .report-bar, .row-actions").forEach((n) => n.remove());
  // Long values: show the full text instead of the "click to expand" preview
  copy.querySelectorAll("td.val details").forEach((d) => {
    const pre = d.querySelector("pre");
    d.replaceWith(el("span", { style: "white-space:pre-wrap" }, pre ? pre.textContent : d.textContent));
  });
  copy.querySelectorAll("details").forEach((d) => d.setAttribute("open", ""));
  return copy;
}

function section(title, ...kids) {
  return el("div", { class: "report-section" }, title ? el("h2", {}, title) : null, ...kids);
}

async function buildReport(kind) {
  const titles = { site: "Fingerprinting on this site", me: "My browser fingerprint", snaps: "Saved snapshots" };
  const now = new Date();
  const ua = current && current.components["User agent"] ? current.components["User agent"].value : navigator.userAgent;
  const parts = [];

  if (kind === "site") {
    parts.push(reportCopy($("#site-summary")), reportCopy($("#site-list")));
  }

  if (kind === "me") {
    parts.push(reportCopy($("#me-summary")));
    if ($("#webrtc-out").childElementCount) parts.push(section("WebRTC leak test", reportCopy($("#webrtc-out"))));
    parts.push(reportCopy($("#me-list")));
  }

  if (kind === "snaps") {
    const { snapshots = [] } = await api.storage.local.get("snapshots");
    parts.push(section("All snapshots", el("table", {}, el("tbody", {},
      snapshots.length ? snapshots.map((s) => el("tr", {},
        el("td", { class: "name" }, el("b", {}, s.label), el("div", { class: "muted" }, s.site)),
        el("td", {}, new Date(s.time).toLocaleString()),
        el("td", { class: "val" }, FPI.prettyId(s.stableId))))
        : el("tr", {}, el("td", {}, "No snapshots saved."))))));
    if ($("#compare-out").childElementCount) parts.push(section("Comparison", reportCopy($("#compare-out"))));
    const chosen = selected.map((id) => snapshots.find((s) => s.id === id)).filter(Boolean);
    if (!chosen.length) {
      parts.push(el("p", { class: "muted" }, "Tick snapshots before saving to include their full details in the report."));
    }
    for (const s of chosen) {
      parts.push(el("div", { class: "report-section" },
        el("div", { class: "summary" },
          el("div", { class: "big" }, s.label),
          el("div", { class: "muted" }, `${s.site} • ${new Date(s.time).toLocaleString()}`),
          el("div", { class: "id" }, FPI.prettyId(s.stableId))),
        ...[...componentTables(s.components)].map((n) => reportCopy(n))));
    }
  }

  return el("div", { class: "report" },
    el("div", { class: "report-head" },
      el("div", { class: "report-title" }, "Fingerprint Inspector"),
      el("div", { class: "report-sub" }, titles[kind]),
      el("div", { class: "muted" },
        `${kind === "snaps" ? "All sites" : ($("#site").textContent || "")} • ${now.toLocaleString()}`),
      el("div", { class: "muted" }, ua)),
    ...parts,
    el("div", { class: "report-foot" },
      el("b", {}, `Fingerprint Inspector v${api.runtime.getManifest().version}. `), FPI.REPORT_NOTE));
}

// Draw an element into a PNG using an SVG "foreignObject" (plain HTML inside an image).
async function renderPng(report) {
  const css = await (await fetch(api.runtime.getURL("popup.css"))).text();

  // Measure the report at its final width, hidden off-screen.
  const holder = el("div", { style: `position:absolute;left:-30000px;top:0;width:${REPORT_WIDTH}px` }, report);
  document.body.append(holder);
  const height = Math.ceil(report.getBoundingClientRect().height) + 2;
  const xhtml = new XMLSerializer().serializeToString(report);
  holder.remove();

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${REPORT_WIDTH}" height="${height}">` +
    `<foreignObject width="100%" height="100%">` +
    `<div xmlns="http://www.w3.org/1999/xhtml"><style>${css.replace(/<\/?style/g, "")}</style>${xhtml}</div>` +
    `</foreignObject></svg>`;

  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  await img.decode();

  // 2x for sharp text, scaled down if the image would be too tall for the browser
  const scale = Math.min(2, 30000 / height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(REPORT_WIDTH * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0);
  return new Promise((res) => canvas.toBlob(res, "image/png"));
}

function reportFileName(kind) {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
  const site = kind === "snaps" ? "snapshots" : ($("#site").textContent || "page").replace(/[^a-z0-9.-]+/gi, "_");
  const names = { site: "site-report", me: "fingerprint", snaps: "comparison" };
  return `fingerprint-inspector_${site}_${names[kind]}_${stamp}.png`;
}

async function saveReport(kind, button) {
  const label = button.textContent;
  button.disabled = true;
  button.textContent = "Building…";
  try {
    const blob = await renderPng(await buildReport(kind));
    const url = URL.createObjectURL(blob);
    const filename = reportFileName(kind);
    if (api.downloads && api.downloads.download) {
      await api.downloads.download({ url, filename, saveAs: false });
    } else {
      const a = el("a", { href: url, download: filename });
      document.body.append(a); a.click(); a.remove();
    }
    button.textContent = "Saved to Downloads ✓";
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) {
    console.error(e);
    button.textContent = "Couldn't save, try again";
  }
  setTimeout(() => { button.textContent = label; button.disabled = false; }, 2500);
}

document.querySelectorAll(".save-png").forEach((btn) =>
  btn.addEventListener("click", () => saveReport(btn.dataset.report, btn)));
