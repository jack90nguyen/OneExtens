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

chrome.action.onClicked.addListener((tab) => {
  const tabId = tab && tab.id;
  if (!tabId) {
    return;
  }

  chrome.tabs
    .sendMessage(tabId, { type: "RUN_AUTOFILL" })
    .then((response) => {
      if (!response || !response.ok) {
        const message = getErrorMessage(response && response.error, "Autofill failed on this page.");
        showTabAlert(tabId, message);
      }
    })
    .catch((error) => {
      const message = getErrorMessage(error, "Cannot run autofill on this page.");
      showTabAlert(tabId, message);
    });
});
