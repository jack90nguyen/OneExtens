const CAPTURE_MIN_INTERVAL_MS = 600;
const CAPTURE_SETTLE_MS = 350;
const CAPTURE_MAX_DIMENSION = 16384;
const CAPTURE_MAX_AREA = 200000000;

let pendingCapture = null;
let captureRunning = false;

function showTabAlert(tabId, message) {
  if (!tabId || !message) {
    return;
  }

  chrome.scripting
    .executeScript({
      target: { tabId },
      func: (text) => {
        window.alert(text);
      },
      args: [message]
    })
    .catch(() => {});
}

function getErrorMessage(error, fallback) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error) {
    return error;
  }

  return fallback;
}

function delay(ms) {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendToContent(tabId, message) {
  const response = await chrome.tabs.sendMessage(tabId, message);
  if (!response || !response.ok) {
    throw new Error(getErrorMessage(response && response.error, "Page did not respond to capture request."));
  }
  return response.result;
}

function dataUrlToBlob(dataUrl) {
  const commaIndex = dataUrl.indexOf(",");
  const header = dataUrl.slice(0, commaIndex);
  const binary = atob(dataUrl.slice(commaIndex + 1));
  const mimeMatch = header.match(/data:([^;]+)/);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: mimeMatch ? mimeMatch[1] : "image/png" });
}

async function blobToDataUrl(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const chunkSize = 0x8000;
  let binary = "";

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }

  return `data:${blob.type};base64,${btoa(binary)}`;
}

function buildFileName(host) {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  const stamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    "-",
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds())
  ].join("");
  const safeHost = (host || "page").replace(/[^a-z0-9.-]/gi, "_");

  return `onextens-${safeHost}-${stamp}.png`;
}

function clampCaptureHeight(totalHeight, viewportWidth, ratio) {
  const maxByDimension = Math.floor(CAPTURE_MAX_DIMENSION / ratio);
  const maxByArea = Math.floor(CAPTURE_MAX_AREA / ratio / Math.max(1, Math.round(viewportWidth * ratio)));
  return Math.min(totalHeight, maxByDimension, maxByArea);
}

async function stitchShots(shots, canvasWidth, canvasHeight) {
  const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
  const context = canvas.getContext("2d");

  for (const shot of shots) {
    const bitmap = await createImageBitmap(dataUrlToBlob(shot.dataUrl));
    const sourceWidth = Math.min(canvasWidth, bitmap.width);
    context.drawImage(bitmap, 0, 0, sourceWidth, bitmap.height, 0, shot.offsetY, sourceWidth, bitmap.height);
    bitmap.close();
  }

  return canvas.convertToBlob({ type: "image/png" });
}

async function captureFullPage(tabId, windowId) {
  const metrics = await sendToContent(tabId, { type: "CAPTURE_PREPARE" });
  const ratio = metrics.devicePixelRatio || 1;
  const viewportHeight = metrics.viewportHeight;

  if (!viewportHeight) {
    throw new Error("Cannot read page size.");
  }

  const captureHeight = clampCaptureHeight(metrics.totalHeight, metrics.viewportWidth, ratio);
  const canvasWidth = Math.round(metrics.viewportWidth * ratio);
  const canvasHeight = Math.round(captureHeight * ratio);
  const shots = [];
  let lastCaptureAt = 0;
  let step = 0;

  try {
    for (let y = 0; y < captureHeight; y += viewportHeight) {
      const scrolled = await sendToContent(tabId, { type: "CAPTURE_SCROLL", y });
      await delay(CAPTURE_SETTLE_MS);
      await delay(CAPTURE_MIN_INTERVAL_MS - (Date.now() - lastCaptureAt));

      const dataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: "png" });
      lastCaptureAt = Date.now();
      shots.push({ dataUrl, offsetY: Math.round(scrolled.scrollY * ratio) });

      step += 1;
      if (step === 1) {
        await sendToContent(tabId, { type: "CAPTURE_HIDE_FIXED" });
      }
    }
  } finally {
    await sendToContent(tabId, { type: "CAPTURE_RESTORE" }).catch(() => {});
  }

  const blob = await stitchShots(shots, canvasWidth, canvasHeight);

  return {
    dataUrl: await blobToDataUrl(blob),
    fileName: buildFileName(metrics.pageHost),
    pageUrl: metrics.pageUrl,
    width: canvasWidth,
    height: canvasHeight,
    truncated: captureHeight < metrics.totalHeight
  };
}

async function runCapture() {
  if (captureRunning) {
    return;
  }

  captureRunning = true;
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  const tabId = tab && tab.id;

  try {
    if (!tabId) {
      return;
    }

    pendingCapture = await captureFullPage(tabId, tab.windowId);
    await chrome.tabs.create({ url: chrome.runtime.getURL("popup/viewer.html") });
  } catch (error) {
    showTabAlert(tabId, getErrorMessage(error, "Cannot capture this page."));
  } finally {
    captureRunning = false;
  }
}

function runAutofill() {
  chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    const tab = tabs[0];
    const tabId = tab && tab.id;
    if (!tabId) {
      return;
    }

    chrome.tabs
      .sendMessage(tabId, { type: "RUN_AUTOFILL" })
      .then((response) => {
        if (!response || !response.ok) {
          const errorMessage = getErrorMessage(response && response.error, "Autofill failed on this page.");
          showTabAlert(tabId, errorMessage);
        }
      })
      .catch((error) => {
        const errorMessage = getErrorMessage(error, "Cannot run autofill on this page.");
        showTabAlert(tabId, errorMessage);
      });
  });
}

function runCheckerboard() {
  chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    const tab = tabs[0];
    const tabId = tab && tab.id;
    if (!tabId) {
      return;
    }

    chrome.tabs
      .sendMessage(tabId, { type: "TOGGLE_CHECKER" })
      .then((response) => {
        if (!response || !response.ok) {
          const errorMessage = getErrorMessage(response && response.error, "Checkerboard failed on this page.");
          showTabAlert(tabId, errorMessage);
        }
      })
      .catch((error) => {
        const errorMessage = getErrorMessage(error, "Cannot toggle checkerboard on this page.");
        showTabAlert(tabId, errorMessage);
      });
  });
}

function runPasswordToggle() {
  chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    const tab = tabs[0];
    const tabId = tab && tab.id;
    if (!tabId) {
      return;
    }

    chrome.tabs
      .sendMessage(tabId, { type: "TOGGLE_PASSWORD" })
      .then((response) => {
        if (!response || !response.ok) {
          const errorMessage = getErrorMessage(response && response.error, "Password toggle failed on this page.");
          showTabAlert(tabId, errorMessage);
        }
      })
      .catch((error) => {
        const errorMessage = getErrorMessage(error, "Cannot toggle password on this page.");
        showTabAlert(tabId, errorMessage);
      });
  });
}

function runJsonToggle() {
  chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    const tab = tabs[0];
    const tabId = tab && tab.id;
    if (!tabId) {
      return;
    }

    chrome.tabs
      .sendMessage(tabId, { type: "TOGGLE_JSON" })
      .then((response) => {
        if (!response || !response.ok) {
          const errorMessage = getErrorMessage(response && response.error, "JSON view failed on this page.");
          showTabAlert(tabId, errorMessage);
        }
      })
      .catch((error) => {
        const errorMessage = getErrorMessage(error, "Cannot toggle JSON view on this page.");
        showTabAlert(tabId, errorMessage);
      });
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TRIGGER_AUTOFILL") {
    runAutofill();
    return false;
  }

  if (message.type === "TRIGGER_CAPTURE") {
    runCapture();
    return false;
  }

  if (message.type === "TRIGGER_CHECKER") {
    runCheckerboard();
    return false;
  }

  if (message.type === "TRIGGER_PASSWORD") {
    runPasswordToggle();
    return false;
  }

  if (message.type === "TRIGGER_JSON") {
    runJsonToggle();
    return false;
  }

  if (message.type === "GET_CAPTURE") {
    sendResponse({ ok: true, result: pendingCapture });
    pendingCapture = null;
    return false;
  }

  return false;
});
