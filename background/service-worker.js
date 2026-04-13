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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TRIGGER_AUTOFILL") {
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
});
