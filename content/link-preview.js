(() => {
  "use strict";

  const SHOW_DELAY_MS = 250;
  const MAX_SIDE = 720;
  const CURSOR_GAP = 16;
  const EDGE_GAP = 8;
  const IMAGE_PATTERN = /\.(png|jpe?g|gif|webp|avif|bmp|svg|ico)(?:[?#]|$)/i;

  const SHADOW_MARKUP = `
<style>
  .box {
    position: fixed;
    top: 0;
    left: 0;
    display: none;
    box-sizing: border-box;
    padding: 6px;
    border-radius: 10px;
    border: 1px solid rgba(0, 0, 0, 0.22);
    background: #ffffff;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.32);
    font: 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #59636e;
    /* Dark mode inverts the whole page, so it hands us the inverse filter to
       cancel it with. It goes here rather than on the host: a filter on the
       host would make it the containing block for this fixed box. */
    filter: var(--onex-unfilter, none);
  }
  .box.on { display: block; }
  .status { padding: 6px 10px; }
  /* The checkerboard colours come from the Image Background setting, written
     onto the box as custom properties so a saved change repaints in place. */
  img {
    display: none;
    /* Viewport units rather than a measured number: the cap then follows a
       window resize on its own, where a value read when the tooltip opened
       would stay stale until the next hover. EDGE_GAP * 2 plus the box's own
       padding and border come to 30px, so 32 leaves a little slack. */
    max-width: min(${MAX_SIDE}px, calc(100vw - 32px));
    max-height: min(${MAX_SIDE}px, calc(100vh - 32px));
    border-radius: 5px;
    background-color: var(--onex-checker-base, #9a9a9a);
    background-image:
      linear-gradient(45deg, var(--onex-checker-tile, #6e6e6e) 25%, transparent 25%),
      linear-gradient(-45deg, var(--onex-checker-tile, #6e6e6e) 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, var(--onex-checker-tile, #6e6e6e) 75%),
      linear-gradient(-45deg, transparent 75%, var(--onex-checker-tile, #6e6e6e) 75%);
    background-size: 16px 16px;
    background-position: 0 0, 0 8px, 8px -8px, -8px 0;
  }
  img.on { display: block; }
  @media (prefers-color-scheme: dark) {
    .box { background: #1f2328; border-color: rgba(255, 255, 255, 0.18); color: #9198a1; }
  }
</style>
<div class="box"><div class="status">Loading…</div><img alt=""></div>
`;

  const state = {
    box: null,
    image: null,
    status: null,
    timer: null,
    anchor: null,
    palette: null,
    x: 0,
    y: 0
  };

  function applyPalette() {
    const api = window.__onexCheckerPalette;
    if (!state.box || !api) {
      return;
    }

    const { base, tile } = api.normalize(state.palette);
    state.box.style.setProperty("--onex-checker-base", base);
    state.box.style.setProperty("--onex-checker-tile", tile);
  }

  function isImageLink(anchor) {
    const href = anchor.getAttribute("href") || "";
    if (!/^https?:/i.test(anchor.href)) {
      return false;
    }
    return IMAGE_PATTERN.test(href) || IMAGE_PATTERN.test(anchor.href);
  }

  function build() {
    if (state.box) {
      return;
    }

    const host = document.createElement("div");
    host.id = "__onex-link-preview";
    host.style.cssText = "all: initial; position: fixed; z-index: 2147483647; pointer-events: none;";
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = SHADOW_MARKUP;
    document.documentElement.appendChild(host);

    state.box = shadow.querySelector(".box");
    state.image = shadow.querySelector("img");
    state.status = shadow.querySelector(".status");
    state.image.addEventListener("load", place);
    state.image.addEventListener("error", hide);
    applyPalette();
  }

  function place() {
    if (!state.box) {
      return;
    }

    if (state.image.getAttribute("src")) {
      state.image.classList.add("on");
      state.status.style.display = "none";
    }

    const rect = state.box.getBoundingClientRect();
    let left = state.x + CURSOR_GAP;
    let top = state.y + CURSOR_GAP;

    if (left + rect.width > window.innerWidth - EDGE_GAP) {
      left = state.x - CURSOR_GAP - rect.width;
    }
    if (top + rect.height > window.innerHeight - EDGE_GAP) {
      top = state.y - CURSOR_GAP - rect.height;
    }

    state.box.style.left = `${Math.max(EDGE_GAP, left)}px`;
    state.box.style.top = `${Math.max(EDGE_GAP, top)}px`;
  }

  function show(anchor) {
    build();
    state.anchor = anchor;
    state.image.classList.remove("on");
    state.status.style.display = "";
    state.box.classList.add("on");
    state.image.src = anchor.href;
    place();
  }

  function hide() {
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = null;
    }

    state.anchor = null;
    if (!state.box) {
      return;
    }

    state.box.classList.remove("on");
    state.image.classList.remove("on");
    state.image.removeAttribute("src");
  }

  document.addEventListener(
    "mouseover",
    (event) => {
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!anchor || !isImageLink(anchor)) {
        if (state.anchor || state.timer) {
          hide();
        }
        return;
      }

      if (anchor === state.anchor) {
        return;
      }

      hide();
      state.x = event.clientX;
      state.y = event.clientY;
      state.timer = setTimeout(() => {
        state.timer = null;
        show(anchor);
      }, SHOW_DELAY_MS);
    },
    true
  );

  window.addEventListener("scroll", hide, true);
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hide();
    }
  });

  const paletteApi = window.__onexCheckerPalette;
  if (paletteApi) {
    paletteApi.load().then((palette) => {
      state.palette = palette;
      applyPalette();
    });
    paletteApi.onChange((palette) => {
      state.palette = palette;
      applyPalette();
    });
  }

  window.__autofillLinkPreview = {
    isImageLink,
    hide
  };
})();
