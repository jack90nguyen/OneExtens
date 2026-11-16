(() => {
  "use strict";

  const STORAGE_KEY = "checkerPalette";
  const SIZE = 24;
  const DEFAULT_ID = "grey";

  // Contrast of a white fringe and a black region against each tone, by the
  // WCAG relative-luminance formula. Grey is the default because it is the
  // only preset both ends stay readable on: light leaves a white fringe at
  // exactly 1.00, which is invisible rather than merely faint.
  const PRESETS = [
    { id: "light", label: "Light", base: "#ffffff", tile: "#c8c8c8", note: "white 1.00 / black 21.00" },
    { id: "grey", label: "Grey", base: "#9a9a9a", tile: "#6e6e6e", note: "white 2.81 / black 7.46" },
    { id: "dark", label: "Dark", base: "#3a3a3a", tile: "#2b2b2b", note: "white 11.37 / black 1.85" },
    { id: "magenta", label: "Magenta", base: "#ff00ff", tile: "#d400d4", note: "white 3.14 / black 6.70" }
  ];

  const CUSTOM_ID = "custom";
  const HEX_PATTERN = /^#[0-9a-f]{6}$/i;

  function presetById(id) {
    return PRESETS.find((preset) => preset.id === id) || null;
  }

  function fallback() {
    const preset = presetById(DEFAULT_ID);
    return { id: preset.id, base: preset.base, tile: preset.tile };
  }

  // Stored values are read back into CSS, so anything that is not a plain
  // 6-digit hex is dropped rather than passed through.
  function normalize(stored) {
    if (!stored || typeof stored !== "object") {
      return fallback();
    }

    if (stored.id === CUSTOM_ID) {
      const base = HEX_PATTERN.test(stored.base) ? stored.base : null;
      const tile = HEX_PATTERN.test(stored.tile) ? stored.tile : null;
      if (!base || !tile) {
        return fallback();
      }
      return { id: CUSTOM_ID, base, tile };
    }

    const preset = presetById(stored.id);
    if (!preset) {
      return fallback();
    }

    return { id: preset.id, base: preset.base, tile: preset.tile };
  }

  function getStorage() {
    if (typeof chrome === "undefined") {
      return null;
    }

    return chrome.storage && chrome.storage.sync ? chrome.storage.sync : null;
  }

  function load() {
    const storage = getStorage();
    if (!storage) {
      return Promise.resolve(fallback());
    }

    return storage
      .get(STORAGE_KEY)
      .then((result) => normalize(result && result[STORAGE_KEY]))
      .catch(() => fallback());
  }

  function save(palette) {
    const storage = getStorage();
    if (!storage) {
      return Promise.resolve(false);
    }

    return storage
      .set({ [STORAGE_KEY]: normalize(palette) })
      .then(() => true)
      .catch(() => false);
  }

  // Four gradients make the two-tone grid: the tile colour is painted into
  // opposite quarters of each cell, and the base colour shows through the rest.
  function toCss(palette) {
    const { base, tile } = normalize(palette);
    const half = SIZE / 2;

    return {
      backgroundColor: base,
      backgroundImage: [
        `linear-gradient(45deg, ${tile} 25%, transparent 25%)`,
        `linear-gradient(-45deg, ${tile} 25%, transparent 25%)`,
        `linear-gradient(45deg, transparent 75%, ${tile} 75%)`,
        `linear-gradient(-45deg, transparent 75%, ${tile} 75%)`
      ].join(","),
      backgroundSize: `${SIZE}px ${SIZE}px`,
      backgroundPosition: `0 0, 0 ${half}px, ${half}px -${half}px, -${half}px 0`
    };
  }

  // Calls back with the new palette whenever the option page writes one.
  function onChange(handler) {
    if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.onChanged) {
      return;
    }

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync" || !changes[STORAGE_KEY]) {
        return;
      }
      handler(normalize(changes[STORAGE_KEY].newValue));
    });
  }

  window.__onexCheckerPalette = {
    STORAGE_KEY,
    SIZE,
    DEFAULT_ID,
    CUSTOM_ID,
    PRESETS,
    normalize,
    load,
    save,
    toCss,
    onChange
  };
})();
