(() => {
  "use strict";

  const OBSERVE_OPTIONS = { attributes: true, attributeFilter: ["style"] };

  const state = {
    image: null,
    baseStyle: "",
    observer: null,
    palette: null
  };

  function paletteApi() {
    return window.__onexCheckerPalette || null;
  }

  function isImageDocument() {
    return typeof document.contentType === "string" && document.contentType.startsWith("image/");
  }

  // Detach while writing: observer callbacks run as microtasks, so a boolean
  // guard would already be cleared by the time they fire. disconnect() also
  // drops the queued records for our own writes.
  function paint() {
    const image = state.image;
    const api = paletteApi();
    if (!image || !api) {
      return;
    }

    const css = api.toCss(state.palette);
    if (state.observer) {
      state.observer.disconnect();
    }

    image.style.setProperty("background-color", css.backgroundColor, "important");
    image.style.setProperty("background-image", css.backgroundImage, "important");
    image.style.setProperty("background-size", css.backgroundSize, "important");
    image.style.setProperty("background-position", css.backgroundPosition, "important");
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

  const api = paletteApi();
  if (api) {
    // Repaint in place when the option page saves, so an image tab that is
    // already open picks up the new colours without a reload.
    api.onChange((palette) => {
      state.palette = palette;
      if (state.observer) {
        paint();
      }
    });
  }

  if (isImageDocument()) {
    // The stored palette arrives a tick later than document_idle, so paint
    // with the default first and repaint once it resolves. That keeps the
    // checkerboard from flashing in after the image is already on screen.
    enable();
    if (api) {
      api.load().then((palette) => {
        state.palette = palette;
        if (state.observer) {
          paint();
        }
      });
    }
  }
})();
