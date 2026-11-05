(() => {
  "use strict";

  const SHOW_DELAY_MS = 250;
  const MAX_SIDE = 520;
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
  }
  .box.on { display: block; }
  .status { padding: 6px 10px; }
  img {
    display: none;
    max-width: ${MAX_SIDE}px;
    max-height: ${MAX_SIDE}px;
    border-radius: 5px;
    background-color: #ffffff;
    background-image:
      linear-gradient(45deg, #c8c8c8 25%, transparent 25%),
      linear-gradient(-45deg, #c8c8c8 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #c8c8c8 75%),
      linear-gradient(-45deg, transparent 75%, #c8c8c8 75%);
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
    x: 0,
    y: 0
  };

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

  window.__autofillLinkPreview = {
    isImageLink,
    hide
  };
})();
