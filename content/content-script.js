function handleAutofillRequest(sendResponse) {
  const api = window.__autofillExtension || {};
  const runAutofill = api.runAutofill;
  if (typeof runAutofill !== "function") {
    sendResponse({ ok: false, error: "Autofill runtime unavailable" });
    return;
  }

  Promise.resolve()
    .then(() => runAutofill())
    .then((result) => {
      sendResponse({ ok: true, result });
    })
    .catch((error) => {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : "Autofill failed"
      });
    });
}

const CAPTURE_ACTIONS = {
  CAPTURE_PREPARE: (api) => api.prepare(),
  CAPTURE_SCROLL: (api, message) => api.scrollToY(message.y),
  CAPTURE_HIDE_FIXED: (api) => api.hideFixed(),
  CAPTURE_RESTORE: (api) => api.restore()
};

function handleCaptureRequest(message, sendResponse) {
  const api = window.__autofillCapture;
  const action = CAPTURE_ACTIONS[message.type];
  if (!api || typeof action !== "function") {
    sendResponse({ ok: false, error: "Capture runtime unavailable" });
    return;
  }

  try {
    sendResponse({ ok: true, result: action(api, message) });
  } catch (error) {
    sendResponse({
      ok: false,
      error: error instanceof Error ? error.message : "Capture step failed"
    });
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "RUN_AUTOFILL") {
    handleAutofillRequest(sendResponse);
    return true;
  }
  if (message?.type && CAPTURE_ACTIONS[message.type]) {
    handleCaptureRequest(message, sendResponse);
    return true;
  }
  return false;
});

window.addEventListener("keydown", (event) => {
  if (event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === "f") {
    const api = window.__autofillExtension || {};
    if (typeof api.runAutofill === "function") {
      Promise.resolve().then(() => api.runAutofill());
    }
  }
});
