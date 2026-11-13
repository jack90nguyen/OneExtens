(() => {
  "use strict";

  const STYLE_ID = "onex-dark-mode";
  const STORAGE_KEY = "darkModeHosts";

  // Pulls both ends toward mid grey: contrast(k) maps c to (c - 0.5) * k + 0.5,
  // so a plain inverted page lands on #202020 / #dfdfdf instead of pure black
  // on pure white. 0.75 matches a reference dark UI measured at #1f1f24 canvas
  // and #e3e3e4 body text.
  const SOFTEN = 0.75;
  const UNSOFTEN = Math.round((1 / SOFTEN) * 1000) / 1000;

  // invert(1) flips light and dark, hue-rotate(180deg) brings the hue back so
  // blue stays blue instead of turning orange. Media gets the same pair a
  // second time, which cancels the one inherited from <html>, plus the inverse
  // contrast so a photo keeps the contrast it was authored with.
  //
  // The hover-preview host is listed too: a document stylesheet cannot reach
  // the <img> inside its shadow root, so the cancelling filter goes on the
  // host, which covers the whole shadow tree at once.
  const CSS = `
html {
  background-color: #ffffff !important;
  filter: invert(1) hue-rotate(180deg) contrast(${SOFTEN}) !important;
}
img, video, picture, canvas, svg, iframe, embed, object,
[style*="background-image"], #__onex-link-preview {
  filter: contrast(${UNSOFTEN}) invert(1) hue-rotate(180deg) !important;
}
`;

  function isActive() {
    return document.getElementById(STYLE_ID) !== null;
  }

  function enable() {
    if (isActive()) {
      return true;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.documentElement.appendChild(style);
    return true;
  }

  function disable() {
    const style = document.getElementById(STYLE_ID);
    if (!style) {
      return false;
    }

    style.remove();
    return true;
  }

  function storage() {
    return chrome.storage && chrome.storage.local ? chrome.storage.local : null;
  }

  function remember(active) {
    const area = storage();
    if (!area) {
      return;
    }

    area.get(STORAGE_KEY).then((data) => {
      const hosts = Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY] : [];
      const host = location.hostname;
      const next = hosts.filter((item) => item !== host);
      if (active) {
        next.push(host);
      }
      area.set({ [STORAGE_KEY]: next });
    }).catch(() => {
      /* storage is optional: the toggle still works for this page load. */
    });
  }

  function restore() {
    const area = storage();
    if (!area || !location.hostname) {
      return;
    }

    area.get(STORAGE_KEY).then((data) => {
      const hosts = Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY] : [];
      if (hosts.includes(location.hostname)) {
        enable();
      }
    }).catch(() => {
      /* nothing to restore when storage is unavailable. */
    });
  }

  function toggle() {
    if (isActive()) {
      disable();
      remember(false);
      return { active: false };
    }

    enable();
    remember(true);
    return { active: true };
  }

  window.__autofillDarkMode = {
    isActive,
    enable,
    disable,
    toggle
  };

  restore();
})();
