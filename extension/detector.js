// detector.js - runs inside every page and frame BEFORE the page's own scripts.
//
// It wraps the browser features that fingerprinting scripts rely on, so that each
// time a site uses one, we count it and note which script made the call.
// The wrappers always pass the call through unchanged: sites see normal results.

(() => {
  // Keep our own copies in case the page later replaces these globals.
  const later = window.setTimeout.bind(window);
  const dispatch = EventTarget.prototype.dispatchEvent;
  const listen = EventTarget.prototype.addEventListener;
  const unlisten = EventTarget.prototype.removeEventListener;
  const MakeEvent = CustomEvent;
  const doc = document;

  // ---- Private channel to relay.js ----------------------------------------
  // Reports travel as events with a random, secret name. The secret is handed
  // over synchronously right now, before any of the page's own scripts exist,
  // so the website can't listen in or learn that this extension is running.
  const SECRET = "fpi-" + Array.from(crypto.getRandomValues(new Uint32Array(4)), (n) => n.toString(36)).join("");
  let handedOver = false;
  function announce() {
    if (!handedOver) dispatch.call(doc, new MakeEvent("fpi-hello", { detail: SECRET }));
  }
  function onReady() { announce(); }
  function onAck(event) {
    if (event.detail !== "ack") return;
    // relay.js has the secret: stop answering, so nobody can ask for it later.
    handedOver = true;
    unlisten.call(doc, "fpi-ready", onReady);
    unlisten.call(doc, SECRET, onAck);
  }
  listen.call(doc, SECRET, onAck);
  listen.call(doc, "fpi-ready", onReady);   // relay.js loaded after us: it will ask
  announce();                                // relay.js loaded before us: it's listening now

  let counts = {};
  let details = {};
  let scripts = {};
  let pending = false;

  // Work out which script called us by reading the call stack.
  // Our own extension frames don't start with http/file, so they're skipped automatically.
  function callerScript() {
    const lines = (new Error().stack || "").split("\n");
    for (const line of lines) {
      const m = line.match(/((?:https?|file):\/\/[^\s)]+)/);
      // Drop the line number, then any ?query or #hash: those can hold tracking IDs.
      if (m) return m[1].replace(/:\d+(?::\d+)?$/, "").split(/[?#]/)[0];
    }
    return "(inline or unknown script)";
  }

  function record(name, detail) {
    counts[name] = (counts[name] || 0) + 1;
    if (detail !== undefined) (details[name] ||= new Set()).add(String(detail));
    // Reading the stack is slow, so only do it for the first few calls of each kind.
    if (counts[name] <= 30) {
      const set = (scripts[name] ||= new Set());
      if (set.size < 8) set.add(callerScript());
    }
    if (!pending) {
      pending = true;
      later(flush, 400); // batch reports instead of sending one per call
    }
  }

  // Hand the batch to relay.js (which can talk to the rest of the extension)
  // over the secret channel. Only text crosses, never objects.
  function flush() {
    pending = false;
    const toArrays = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, [...v]]));
    const report = JSON.stringify({ counts, details: toArrays(details), scripts: toArrays(scripts) });
    dispatch.call(doc, new MakeEvent(SECRET, { detail: report }));
    counts = {}; details = {}; scripts = {};
  }

  // ---- Wrapping helpers -------------------------------------------------

  // Wrap a method like canvas.toDataURL(). "test" can decide whether a call counts.
  function wrapMethod(owner, prop, name, test, detail) {
    const d = owner && Object.getOwnPropertyDescriptor(owner, prop);
    if (!d || typeof d.value !== "function") return;
    const original = d.value;
    const wrapped = {
      [prop](...args) {
        if (!test || test(args)) record(name, detail ? detail(args) : undefined);
        return original.apply(this, args);
      }
    }[prop];
    Object.defineProperty(owner, prop, { ...d, value: wrapped });
  }

  // Wrap a read-only property like navigator.hardwareConcurrency.
  function wrapGetter(owner, prop, name) {
    const d = owner && Object.getOwnPropertyDescriptor(owner, prop);
    if (!d || typeof d.get !== "function") return;
    const original = d.get;
    const wrapped = {
      get [prop]() {
        record(name, prop);
        return original.call(this);
      }
    };
    Object.defineProperty(owner, prop, { ...d, get: Object.getOwnPropertyDescriptor(wrapped, prop).get });
  }

  // Wrap a constructor like new OfflineAudioContext().
  function wrapConstructor(prop, name) {
    const d = Object.getOwnPropertyDescriptor(window, prop);
    if (!d || typeof d.value !== "function") return;
    const proxy = new Proxy(d.value, {
      construct(target, args, newTarget) {
        record(name);
        return Reflect.construct(target, args, newTarget);
      }
    });
    Object.defineProperty(window, prop, { ...d, value: proxy });
  }

  const P = (cls) => window[cls] && window[cls].prototype;

  // ---- What we watch ----------------------------------------------------

  // Canvas fingerprinting: draw, then read the pixels back
  wrapMethod(P("HTMLCanvasElement"), "toDataURL", "Canvas readback");
  wrapMethod(P("HTMLCanvasElement"), "toBlob", "Canvas readback");
  wrapMethod(P("CanvasRenderingContext2D"), "getImageData", "Canvas readback");
  wrapMethod(P("OffscreenCanvas"), "convertToBlob", "Canvas readback");
  wrapMethod(P("OffscreenCanvasRenderingContext2D"), "getImageData", "Canvas readback");

  // Font probing
  wrapMethod(P("CanvasRenderingContext2D"), "measureText", "Text measuring");
  wrapMethod(P("FontFaceSet"), "check", "Font checks");

  // WebGL: GPU model, render-and-read, capability lists
  const GPU_NAME = [37445, 37446]; // UNMASKED_VENDOR_WEBGL, UNMASKED_RENDERER_WEBGL
  for (const cls of ["WebGLRenderingContext", "WebGL2RenderingContext"]) {
    wrapMethod(P(cls), "getParameter", "WebGL GPU name", ([p]) => GPU_NAME.includes(p));
    wrapMethod(P(cls), "getParameter", "WebGL parameters", ([p]) => !GPU_NAME.includes(p));
    wrapMethod(P(cls), "getExtension", "WebGL GPU name", ([n]) => n === "WEBGL_debug_renderer_info");
    wrapMethod(P(cls), "getSupportedExtensions", "WebGL parameters");
    wrapMethod(P(cls), "getShaderPrecisionFormat", "WebGL parameters");
    wrapMethod(P(cls), "readPixels", "WebGL readback");
  }

  // Audio fingerprinting
  wrapConstructor("OfflineAudioContext", "Audio fingerprint");
  wrapConstructor("webkitOfflineAudioContext", "Audio fingerprint");

  // Devices, battery, network, voices
  wrapMethod(P("MediaDevices"), "enumerateDevices", "Media device list");
  wrapMethod(P("Navigator"), "getBattery", "Battery status");
  wrapConstructor("RTCPeerConnection", "WebRTC connection");
  wrapConstructor("webkitRTCPeerConnection", "WebRTC connection");
  wrapMethod(P("NavigatorUAData"), "getHighEntropyValues", "High-entropy client hints");
  wrapMethod(P("SpeechSynthesis"), "getVoices", "Speech voices");
  wrapMethod(P("Permissions"), "query", "Permission checks", null, ([d]) => (d && d.name) || "?");

  // Plain browser/hardware details (normal sites read some of these too)
  for (const prop of [
    "userAgent", "platform", "vendor", "languages", "hardwareConcurrency", "deviceMemory",
    "maxTouchPoints", "plugins", "mimeTypes", "webdriver", "connection", "pdfViewerEnabled",
    "doNotTrack", "cookieEnabled", "productSub", "oscpu", "buildID", "keyboard", "userAgentData"
  ]) {
    wrapGetter(P("Navigator"), prop, "Navigator properties");
  }
  for (const prop of ["width", "height", "availWidth", "availHeight", "colorDepth", "pixelDepth", "availTop", "availLeft"]) {
    wrapGetter(P("Screen"), prop, "Screen properties");
  }

  wrapMethod(window.Intl && Intl.DateTimeFormat.prototype, "resolvedOptions", "Timezone / locale");
  wrapMethod(P("Date"), "getTimezoneOffset", "Timezone / locale");
  wrapMethod(window, "matchMedia", "Media queries");
})();
