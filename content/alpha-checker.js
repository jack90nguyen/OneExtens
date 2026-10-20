(() => {
  "use strict";

  const CHECKER_COLOR = "#c8c8c8";
  const CHECKER_SIZE = 24;
  const HALF = CHECKER_SIZE / 2;

  const OBSERVE_OPTIONS = { attributes: true, attributeFilter: ["style"] };

  const state = {
    image: null,
    baseStyle: "",
    observer: null
  };

  function isImageDocument() {
    return typeof document.contentType === "string" && document.contentType.startsWith("image/");
  }

  // Detach while writing: observer callbacks run as microtasks, so a boolean
  // guard would already be cleared by the time they fire. disconnect() also
  // drops the queued records for our own writes.
  function paint() {
    const image = state.image;
    if (state.observer) {
      state.observer.disconnect();
    }

    image.style.setProperty("background-color", "#ffffff", "important");
    image.style.setProperty(
      "background-image",
      [
        `linear-gradient(45deg, ${CHECKER_COLOR} 25%, transparent 25%)`,
        `linear-gradient(-45deg, ${CHECKER_COLOR} 25%, transparent 25%)`,
        `linear-gradient(45deg, transparent 75%, ${CHECKER_COLOR} 75%)`,
        `linear-gradient(-45deg, transparent 75%, ${CHECKER_COLOR} 75%)`
      ].join(","),
      "important"
    );
    image.style.setProperty("background-size", `${CHECKER_SIZE}px ${CHECKER_SIZE}px`, "important");
    image.style.setProperty("background-position", `0 0, 0 ${HALF}px, ${HALF}px -${HALF}px, -${HALF}px 0`, "important");
    image.style.setProperty("transition", "none", "important");

    if (state.observer) {
      state.observer.observe(image, OBSERVE_OPTIONS);
    }
  }

  function handleStyleChange() {
    state.baseStyle = state.image.getAttribute("style") || "";
    paint();
  }

  function enable() {
    if (state.observer) {
      return true;
    }

    const image = document.querySelector("img");
    if (!image) {
      return false;
    }

    state.image = image;
    state.baseStyle = image.getAttribute("style") || "";
    paint();

    state.observer = new MutationObserver(handleStyleChange);
    state.observer.observe(image, OBSERVE_OPTIONS);
    return true;
  }

  function disable() {
    if (!state.observer) {
      return false;
    }

    state.observer.disconnect();
    state.observer = null;
    state.image.setAttribute("style", state.baseStyle);
    state.image = null;
    return true;
  }

  function toggle() {
    if (state.observer) {
      disable();
      return { active: false };
    }

    return { active: enable() };
  }

  window.__autofillChecker = {
    isImageDocument,
    enable,
    disable,
    toggle
  };

  if (isImageDocument()) {
    enable();
  }
})();
