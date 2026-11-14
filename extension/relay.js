// relay.js - the go-between. detector.js runs in the page's own world and can't talk
// to the extension directly, so it sends its reports here, and this script forwards
// them to the background worker.
//
// The two scripts agree on a secret event name before the page's own scripts run,
// so the website can't read these reports or see the extension talking.

(() => {
  const api = globalThis.browser ?? globalThis.chrome;
  const send = (msg) => {
    try { api.runtime.sendMessage(msg).catch(() => {}); } catch (e) { /* extension reloaded */ }
  };

  // Page address without ?query or #hash (those can hold IDs or tokens)
  const here = location.origin === "null" ? "(sandboxed frame)" : location.origin;
  if (window === window.top) send({ type: "page-start", url: here + location.pathname });

  let secret = null;
  function onHello(event) {
    if (secret || typeof event.detail !== "string" || !event.detail.startsWith("fpi-")) return;
    secret = event.detail;
    document.removeEventListener("fpi-hello", onHello);
    document.addEventListener(secret, onReport);
    document.dispatchEvent(new CustomEvent(secret, { detail: "ack" })); // tell detector.js we're set
  }
  function onReport(event) {
    if (event.detail === "ack") return;
    let data;
    try { data = JSON.parse(event.detail); } catch (e) { return; }
    send({
      type: "detections",
      origin: here,
      counts: data.counts || {},
      details: data.details || {},
      scripts: data.scripts || {}
    });
  }

  document.addEventListener("fpi-hello", onHello);
  // In case detector.js already ran: ask it to announce the secret again.
  document.dispatchEvent(new CustomEvent("fpi-ready"));
})();
