// shared.js - helpers used by the background worker, the popup and the collector.

var FPI = (() => {
  // Fast 64-bit text hash (cyrb53 style). Same input always gives the same output,
  // so it works as a short ID for long values like canvas images or font lists.
  function hash(input) {
    const str = typeof input === "string" ? input : JSON.stringify(input);
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0");
  }

  // "a1b2c3d4e5f60718" -> "a1b2-c3d4-e5f6-0718", easier to read and compare by eye
  function prettyId(hex) {
    return hex.match(/.{1,4}/g).join("-");
  }

  // What each tracked technique means, and when it counts as a "strong" sign of fingerprinting.
  // Ordinary sites read some of these for normal reasons, so weak signals only matter in bulk.
  const TECHNIQUES = {
    "Canvas readback": {
      strong: () => true,
      about: "Drew something invisible and read the pixels back. Tiny rendering differences between graphics cards, drivers and fonts make this one of the strongest IDs."
    },
    "Text measuring": {
      strong: (t) => t.count >= 50,
      about: "Measured text size. Hundreds of measurements usually means it's testing which fonts you have installed."
    },
    "Font checks": {
      strong: (t) => t.count >= 20,
      about: "Asked the browser whether specific fonts are available. Many checks means font probing."
    },
    "WebGL GPU name": {
      strong: () => true,
      about: "Asked for your graphics card's exact make and model. Rarely needed for anything except identification."
    },
    "WebGL readback": {
      strong: () => true,
      about: "Rendered a 3D scene and read the pixels back. Works like canvas fingerprinting, using your graphics card."
    },
    "WebGL parameters": {
      strong: (t) => t.count >= 20,
      about: "Read your graphics card's limits and supported features. Games do this too, but dozens of reads build a profile."
    },
    "Audio fingerprint": {
      strong: () => true,
      about: "Created a silent, offline audio context. The exact math your audio stack produces is a well-known ID trick."
    },
    "Media device list": {
      strong: () => true,
      about: "Listed your cameras, microphones and speakers. The count and type of devices adds to an ID."
    },
    "Battery status": {
      strong: () => true,
      about: "Read your battery level and charging state, which can link visits made in the same short window."
    },
    "WebRTC connection": {
      strong: () => true,
      about: "Opened a peer-to-peer connection object. Video chat sites need this, but it is also used to discover IP addresses, including behind some VPNs."
    },
    "High-entropy client hints": {
      strong: () => true,
      about: "Requested detailed browser and OS info (exact versions, CPU architecture, device model)."
    },
    "Speech voices": {
      strong: () => true,
      about: "Listed the text-to-speech voices installed on your system, which vary by OS, language packs and setup."
    },
    "Navigator properties": {
      strong: (t) => (t.details || []).length >= 6,
      about: "Read browser and hardware details such as CPU cores, memory, platform and languages. Reading many of them at once is typical of fingerprinting."
    },
    "Screen properties": {
      strong: (t) => (t.details || []).length >= 4,
      about: "Read your screen size and color depth. Common for layout, but it's also part of nearly every fingerprint."
    },
    "Timezone / locale": {
      strong: () => false,
      about: "Checked your timezone or locale settings. Common and mostly harmless alone."
    },
    "Media queries": {
      strong: (t) => t.count >= 15,
      about: "Tested display preferences like dark mode, reduced motion and color gamut. Many tests at once builds a profile."
    },
    "Permission checks": {
      strong: (t) => (t.details || []).length >= 3,
      about: "Checked the state of several permissions (camera, notifications, etc.) without asking for them."
    }
  };

  // Turn raw detection data into a sorted list for display.
  function analyze(techniques) {
    return Object.entries(techniques || {})
      .map(([name, t]) => {
        const info = TECHNIQUES[name] || { strong: () => false, about: "" };
        return { name, ...t, strong: info.strong(t), about: info.about };
      })
      .sort((a, b) => (b.strong - a.strong) || (b.count - a.count));
  }

  function strongCount(techniques) {
    return analyze(techniques).filter((t) => t.strong).length;
  }

  // ---- Terms shown before first use (bump TERMS_VERSION if they change) ----
  const TERMS_VERSION = "1";
  const DISCLAIMER_URL = "https://davidfeuling.com/fingerprint-inspector/#disclaimer";
  const TERMS = [
    ["Estimates, not proof.", "Results can be incomplete or wrong. Ratings like \"very identifying\" are rough guides, not measurements."],
    ["A detection is not an accusation.", "It shows which browser features a page used, not why. Many uses are legitimate, such as fraud prevention, bot defense and page layout."],
    ["Your own browsers only.", "Use it on browsers and devices you own or are allowed to test, and follow the law and each site's terms."],
    ["Sites may act differently.", "The extension watches browser functions as pages use them. Some sites may notice, behave differently or break. Turn it off for any site that misbehaves."],
    ["Nothing leaves your computer.", "No data is collected or sent anywhere. The one exception is the optional WebRTC test, which contacts Google's STUN server only when you start it."],
    ["No warranty.", "Provided as-is, free of charge. You use it at your own risk, and the author is not liable for any outcome of using it or relying on its results."]
  ];
  const REPORT_NOTE =
    "Results are estimates from one browser at one moment. A detected technique shows which browser features a page used, " +
    "not why; many uses are legitimate. Not legal, security or privacy advice. Provided as-is with no warranty. " +
    "This report describes your browser and device, so review it before sharing.";

  return { hash, prettyId, analyze, strongCount, TECHNIQUES, TERMS_VERSION, DISCLAIMER_URL, TERMS, REPORT_NOTE };
})();
