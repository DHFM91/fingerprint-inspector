// collector.js - when the popup asks, gather the same fingerprint details any
// website could read from this browser on this page.
//
// This runs in the extension's private copy of the page's JavaScript, so its own
// canvas/audio calls are NOT counted by detector.js as the site's activity.

(() => {
  const api = globalThis.browser ?? globalThis.chrome;

  // weight: how much a value helps tell browsers apart (rough guide from public research)
  //   high   - often unique or close to it
  //   medium - narrows you down a lot when combined
  //   low    - shared by huge numbers of people
  // volatile: changes during normal use, so it's left out of the stable ID
  function makeAdder(out) {
    return (group, name, value, weight, volatile = false) => {
      out[name] = { group, value: value === undefined ? "(not available)" : value, weight, volatile };
    };
  }

  const safe = (fn, fallback = "(blocked or unavailable)") => {
    try { const v = fn(); return v === undefined ? "(not available)" : v; } catch (e) { return fallback; }
  };

  const withTimeout = (promise, ms, fallback) =>
    Promise.race([promise, new Promise((r) => setTimeout(() => r(fallback), ms))]);

  // ---- Canvas ------------------------------------------------------------
  function drawCanvas() {
    const cv = document.createElement("canvas");
    cv.width = 300; cv.height = 70;
    const x = cv.getContext("2d");
    x.textBaseline = "top";
    x.font = "16px Arial";
    x.fillStyle = "#f60";
    x.fillRect(110, 2, 70, 22);
    x.fillStyle = "#069";
    x.fillText("Fingerprint Inspector \u{1F600} ñΩ", 2, 16);
    x.fillStyle = "rgba(102, 204, 0, 0.7)";
    x.fillText("Fingerprint Inspector \u{1F600} ñΩ", 4, 18);
    x.globalCompositeOperation = "multiply";
    for (const [color, cx] of [["#f0f", 40], ["#0ff", 70], ["#ff0", 55]]) {
      x.fillStyle = color;
      x.beginPath();
      x.arc(cx, 45, 20, 0, Math.PI * 2);
      x.fill();
    }
    return cv.toDataURL();
  }

  // ---- Installed fonts (measured on a canvas, nothing shown on the page) --
  const FONTS = [
    "Arial", "Arial Black", "Bahnschrift", "Book Antiqua", "Calibri", "Cambria", "Candara",
    "Cascadia Code", "Century Gothic", "Comic Sans MS", "Consolas", "Constantia", "Corbel",
    "Courier New", "Ebrima", "Franklin Gothic Medium", "Gabriola", "Garamond", "Georgia",
    "Impact", "Lucida Console", "Lucida Sans Unicode", "Malgun Gothic", "Marlett",
    "Microsoft YaHei", "MS Gothic", "Palatino Linotype", "Segoe Print", "Segoe Script",
    "Segoe UI", "Segoe UI Emoji", "SimSun", "Sylfaen", "Tahoma", "Times New Roman",
    "Trebuchet MS", "Verdana", "Webdings", "Wingdings", "Helvetica", "Helvetica Neue",
    "Menlo", "Monaco", "Avenir", "Futura", "Gill Sans", "Optima", "American Typewriter",
    "Baskerville", "Didot", "DejaVu Sans", "Liberation Sans", "Ubuntu", "Noto Sans",
    "Roboto", "Open Sans", "Fira Sans", "Source Code Pro"
  ];
  function detectFonts() {
    const x = document.createElement("canvas").getContext("2d");
    const sample = "mmmmmmmmmmlli1WW@#&";
    const bases = ["monospace", "sans-serif", "serif"];
    const baseWidth = {};
    for (const b of bases) { x.font = `72px ${b}`; baseWidth[b] = x.measureText(sample).width; }
    return FONTS.filter((font) => bases.some((b) => {
      x.font = `72px "${font}", ${b}`;
      return x.measureText(sample).width !== baseWidth[b];
    }));
  }

  // ---- WebGL -------------------------------------------------------------
  function webgl() {
    const gl = document.createElement("canvas").getContext("webgl");
    if (!gl) return null;
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const params = {};
    for (const p of [
      "MAX_TEXTURE_SIZE", "MAX_VIEWPORT_DIMS", "MAX_RENDERBUFFER_SIZE", "MAX_VERTEX_ATTRIBS",
      "MAX_VARYING_VECTORS", "MAX_VERTEX_UNIFORM_VECTORS", "MAX_FRAGMENT_UNIFORM_VECTORS",
      "MAX_COMBINED_TEXTURE_IMAGE_UNITS", "ALIASED_LINE_WIDTH_RANGE", "ALIASED_POINT_SIZE_RANGE",
      "VERSION", "SHADING_LANGUAGE_VERSION"
    ]) {
      const v = gl.getParameter(gl[p]);
      params[p] = v && v.length !== undefined && typeof v !== "string" ? Array.from(v).join("x") : v;
    }
    return {
      vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
      renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      params,
      extensions: gl.getSupportedExtensions() || []
    };
  }

  // ---- Audio (silent, offline: nothing is played) -------------------------
  async function audio() {
    const AC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!AC) return null;
    const ctx = new AC(1, 5000, 44100);
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = 10000;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -50; comp.knee.value = 40; comp.ratio.value = 12;
    comp.attack.value = 0; comp.release.value = 0.25;
    osc.connect(comp); comp.connect(ctx.destination); osc.start(0);
    const buffer = await ctx.startRendering();
    const data = buffer.getChannelData(0);
    let sum = 0;
    for (let i = 4500; i < 5000; i++) sum += Math.abs(data[i]);
    return sum.toString();
  }

  // ---- Speech voices (the list sometimes loads a moment late) ------------
  function voices() {
    if (!window.speechSynthesis) return Promise.resolve(null);
    const read = () => speechSynthesis.getVoices().map((v) => `${v.name} (${v.lang})`);
    const now = read();
    if (now.length) return Promise.resolve(now);
    return withTimeout(new Promise((res) => {
      speechSynthesis.addEventListener("voiceschanged", () => res(read()), { once: true });
    }), 800, []);
  }

  function mediaQuery(options) {
    for (const [label, query] of options) if (matchMedia(query).matches) return label;
    return "no match";
  }

  // ---- Put it all together -----------------------------------------------
  async function collect() {
    const c = {};
    const add = makeAdder(c);
    const n = navigator;

    // Browser
    add("Browser", "User agent", safe(() => n.userAgent), "high");
    add("Browser", "Brands / platform (client hints)", safe(() => n.userAgentData
      ? { brands: n.userAgentData.brands.map((b) => `${b.brand} ${b.version}`), platform: n.userAgentData.platform, mobile: n.userAgentData.mobile }
      : "(not supported)"), "medium");
    if (n.userAgentData && n.userAgentData.getHighEntropyValues) {
      const hints = await withTimeout(n.userAgentData.getHighEntropyValues(
        ["architecture", "bitness", "model", "platformVersion", "fullVersionList"]).catch(() => null), 1000, null);
      if (hints) {
        add("Browser", "Detailed client hints", {
          architecture: hints.architecture, bitness: hints.bitness, model: hints.model || "(none)",
          platformVersion: hints.platformVersion,
          versions: (hints.fullVersionList || []).map((b) => `${b.brand} ${b.version}`)
        }, "high");
      }
    }
    add("Browser", "Vendor", safe(() => n.vendor), "low");
    add("Browser", "Plugins", safe(() => Array.from(n.plugins).map((p) => p.name)), "medium");
    add("Browser", "Built-in PDF viewer", safe(() => n.pdfViewerEnabled), "low");
    add("Browser", "Automation flag (webdriver)", safe(() => n.webdriver), "low");

    // Hardware
    add("Hardware", "CPU threads", safe(() => n.hardwareConcurrency), "medium");
    add("Hardware", "Memory (GB, rounded)", safe(() => n.deviceMemory), "medium");
    add("Hardware", "Touch points", safe(() => n.maxTouchPoints), "low");
    const gl = safe(webgl, null);
    if (gl && typeof gl === "object") {
      add("Hardware", "Graphics card (WebGL)", `${gl.vendor} | ${gl.renderer}`, "high");
      add("Rendering", "WebGL capabilities", { id: FPI.hash([gl.params, gl.extensions]), extensions: gl.extensions.length, ...gl.params }, "high");
    } else {
      add("Hardware", "Graphics card (WebGL)", "(WebGL unavailable)", "low");
    }
    const devices = await withTimeout((n.mediaDevices && n.mediaDevices.enumerateDevices
      ? n.mediaDevices.enumerateDevices() : Promise.resolve(null)).catch(() => null), 1000, null);
    add("Hardware", "Media devices (counts)", devices
      ? devices.reduce((acc, d) => ((acc[d.kind] = (acc[d.kind] || 0) + 1), acc), {})
      : "(unavailable)", "medium");

    // Screen
    add("Screen", "Screen size", `${screen.width} x ${screen.height}`, "high");
    add("Screen", "Usable screen area", `${screen.availWidth} x ${screen.availHeight}`, "medium");
    add("Screen", "Color depth", screen.colorDepth, "low");
    add("Screen", "Pixel ratio (zoom/scaling)", window.devicePixelRatio, "medium");
    add("Screen", "Window size", `${innerWidth} x ${innerHeight}`, "medium", true);

    // Locale
    const intl = safe(() => Intl.DateTimeFormat().resolvedOptions(), {});
    add("Locale", "Timezone", intl.timeZone, "medium");
    add("Locale", "UTC offset (minutes)", new Date().getTimezoneOffset(), "low");
    add("Locale", "Languages", safe(() => Array.from(n.languages)), "medium");
    add("Locale", "Locale / calendar", `${intl.locale} | ${intl.calendar} | ${intl.numberingSystem}`, "low");
    add("Locale", "Number & date format", `${(1234567.891).toLocaleString()} | ${new Date(0).toLocaleDateString()}`, "low");

    // Rendering
    const canvasA = safe(drawCanvas, "(blocked)");
    const canvasB = safe(drawCanvas, "(blocked)");
    const canvasNoise = canvasA !== canvasB;
    add("Rendering", "Canvas image", canvasNoise ? "(randomized each time)" : FPI.hash(canvasA), "high");
    add("Rendering", "Installed fonts", safe(detectFonts, "(blocked)"), "high");
    const audioA = await withTimeout(audio().catch(() => "(blocked)"), 2000, "(timed out)");
    const audioB = await withTimeout(audio().catch(() => "(blocked)"), 2000, "(timed out)");
    const audioNoise = audioA !== audioB;
    add("Rendering", "Audio processing", audioNoise ? "(randomized each time)" : audioA, "high");
    add("Rendering", "Math precision", FPI.hash([Math.tan(-1e300), Math.sinh(1), Math.expm1(1),
      Math.cbrt(100), Math.atanh(0.5), Math.log1p(10), Math.cosh(10)]), "low");

    // Preferences & settings
    add("Preferences", "Display preferences", {
      colorScheme: mediaQuery([["dark", "(prefers-color-scheme: dark)"], ["light", "(prefers-color-scheme: light)"]]),
      reducedMotion: mediaQuery([["reduce", "(prefers-reduced-motion: reduce)"], ["no-preference", "(prefers-reduced-motion: no-preference)"]]),
      contrast: mediaQuery([["more", "(prefers-contrast: more)"], ["less", "(prefers-contrast: less)"], ["no-preference", "(prefers-contrast: no-preference)"]]),
      forcedColors: mediaQuery([["active", "(forced-colors: active)"], ["none", "(forced-colors: none)"]]),
      colorGamut: mediaQuery([["rec2020", "(color-gamut: rec2020)"], ["p3", "(color-gamut: p3)"], ["srgb", "(color-gamut: srgb)"]]),
      hdr: mediaQuery([["high", "(dynamic-range: high)"], ["standard", "(dynamic-range: standard)"]]),
      pointer: mediaQuery([["fine", "(pointer: fine)"], ["coarse", "(pointer: coarse)"], ["none", "(pointer: none)"]])
    }, "medium");
    const voiceList = await voices();
    add("Preferences", "Speech voices", voiceList === null ? "(unsupported)"
      : { count: voiceList.length, id: FPI.hash(voiceList), sample: voiceList.slice(0, 5) }, "medium");
    add("Preferences", "Do Not Track", safe(() => n.doNotTrack), "low");
    add("Preferences", "Global Privacy Control", safe(() => n.globalPrivacyControl), "low");
    add("Preferences", "Cookies enabled", safe(() => n.cookieEnabled), "low");
    add("Preferences", "Local storage", safe(() => { localStorage.getItem("x"); return "available"; }, "blocked"), "low");
    add("Preferences", "Connection type", safe(() => n.connection ? n.connection.effectiveType : "(not reported)"), "low", true);

    return {
      site: location.hostname || location.href,
      url: location.href,
      time: Date.now(),
      noise: { canvas: canvasNoise, audio: audioNoise },
      components: c
    };
  }

  api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.type === "collect") {
      collect().then(sendResponse, (e) => sendResponse({ error: String(e) }));
      return true; // keep the reply channel open for the async answer
    }
  });
})();
