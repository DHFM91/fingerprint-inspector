// background.js - collects detection reports per tab and updates the toolbar badge.
// Results are kept in session storage (cleared when the browser closes).

if (typeof FPI === "undefined" && typeof importScripts === "function") importScripts("shared.js");

const api = globalThis.browser ?? globalThis.chrome;
const key = (tabId) => "tab" + tabId;

// Reports can arrive quickly from many frames. This chain makes each tab's
// updates happen one at a time so none overwrite each other.
const chains = {};
function update(tabId, change) {
  chains[tabId] = (chains[tabId] || Promise.resolve()).then(async () => {
    const stored = await api.storage.session.get(key(tabId));
    const data = change(stored[key(tabId)]);
    await api.storage.session.set({ [key(tabId)]: data });
    await setBadge(tabId, data);
  }).catch(() => {});
  return chains[tabId];
}

function addUnique(list, items, max) {
  for (const item of items || []) {
    if (!list.includes(item) && list.length < max) list.push(item);
  }
}

async function setBadge(tabId, data) {
  // No badge until the terms have been accepted
  const { acceptedTerms } = await api.storage.local.get("acceptedTerms");
  const strong = acceptedTerms === FPI.TERMS_VERSION ? FPI.strongCount(data.techniques) : 0;
  try {
    await api.action.setBadgeText({ tabId, text: strong ? String(strong) : "" });
    await api.action.setBadgeBackgroundColor({ tabId, color: strong >= 3 ? "#c62828" : "#ef6c00" });
  } catch (e) { /* tab already closed */ }
}

api.runtime.onMessage.addListener((msg, sender) => {
  const tabId = sender.tab && sender.tab.id;
  if (tabId == null || tabId < 0) return;

  if (msg.type === "page-start" && sender.frameId === 0) {
    update(tabId, () => ({ url: msg.url, startedAt: Date.now(), techniques: {} }));
  }

  if (msg.type === "detections") {
    update(tabId, (data) => {
      data = data || { url: sender.tab.url || "", startedAt: Date.now(), techniques: {} };
      for (const [name, count] of Object.entries(msg.counts || {})) {
        const t = (data.techniques[name] ||= { count: 0, details: [], scripts: [], frames: [] });
        t.count += count;
        addUnique(t.details, msg.details[name], 40);
        addUnique(t.scripts, msg.scripts[name], 15);
        addUnique(t.frames, [msg.origin], 10);
      }
      return data;
    });
  }
});

api.tabs.onRemoved.addListener((tabId) => {
  api.storage.session.remove(key(tabId));
  delete chains[tabId];
});

// First install: open the welcome page, which shows the terms.
api.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") api.tabs.create({ url: api.runtime.getURL("welcome.html") });
});
