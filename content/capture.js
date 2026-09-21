(() => {
  "use strict";

  const STYLE_ID = "__onex-capture-style";
  const HIDDEN_FLAG = "__onexCaptureHidden";

  const state = {
    scrollX: 0,
    scrollY: 0,
    hidden: []
  };

  function getMetrics() {
    const doc = document.documentElement;
    const body = document.body;
    const totalHeight = Math.max(
      doc.scrollHeight,
      doc.offsetHeight,
      body ? body.scrollHeight : 0,
      body ? body.offsetHeight : 0
    );

    return {
      totalHeight,
      viewportHeight: doc.clientHeight,
      viewportWidth: doc.clientWidth,
      devicePixelRatio: window.devicePixelRatio || 1,
      pageUrl: location.href,
      pageHost: location.hostname
    };
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = "html, body { scroll-behavior: auto !important; }";
    document.documentElement.appendChild(style);
  }

  function removeStyle() {
    const style = document.getElementById(STYLE_ID);
    if (style && style.parentNode) {
      style.parentNode.removeChild(style);
    }
  }

  function prepare() {
    state.scrollX = window.scrollX;
    state.scrollY = window.scrollY;
    state.hidden = [];
    injectStyle();
    window.scrollTo(0, 0);
    return getMetrics();
  }

  function scrollToY(y) {
    window.scrollTo(0, y);
    return { scrollY: window.scrollY };
  }

  function isCapturePinned(element) {
    const style = window.getComputedStyle(element);
    if (style.position !== "fixed" && style.position !== "sticky") {
      return false;
    }
    if (style.visibility === "hidden" || style.display === "none") {
      return false;
    }
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function hideFixed() {
    if (!document.body) {
      return { hidden: 0 };
    }

    const elements = document.body.querySelectorAll("*");
    for (const element of elements) {
      if (element.id === STYLE_ID || element[HIDDEN_FLAG]) {
        continue;
      }
      if (!isCapturePinned(element)) {
        continue;
      }

      state.hidden.push({
        element,
        value: element.style.getPropertyValue("visibility"),
        priority: element.style.getPropertyPriority("visibility")
      });
      element[HIDDEN_FLAG] = true;
      element.style.setProperty("visibility", "hidden", "important");
    }

    return { hidden: state.hidden.length };
  }

  function restore() {
    for (const entry of state.hidden) {
      const element = entry.element;
      delete element[HIDDEN_FLAG];
      if (entry.value) {
        element.style.setProperty("visibility", entry.value, entry.priority);
      } else {
        element.style.removeProperty("visibility");
      }
    }

    state.hidden = [];
    removeStyle();
    window.scrollTo(state.scrollX, state.scrollY);
    return { ok: true };
  }

  window.__autofillCapture = {
    getMetrics,
    prepare,
    scrollToY,
    hideFixed,
    restore
  };
})();
