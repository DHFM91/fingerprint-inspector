// relay.js - the go-between. detector.js runs in the page's own world and can't talk
// to the extension directly, so it posts its reports here, and this script forwards
// them to the background worker.

(() => {
  const api = globalThis.browser ?? globalThis.chrome;
  const send = (msg) => {
    try { api.runtime.sendMessage(msg).catch(() => {}); } catch (e) { /* extension reloaded */ }
  };

  // A new page in the main frame means a fresh start for this tab's results.
  if (window === window.top) send({ type: "page-start", url: location.href });

  window.addEventListener("message", (event) => {
    const data = event.data;
    if (event.source !== window || !data || data.__fpi !== 1) return;
    send({
      type: "detections",
      origin: location.origin === "null" ? "(sandboxed frame)" : location.origin,
      counts: data.counts,
      details: data.details,
      scripts: data.scripts
    });
  });
})();
