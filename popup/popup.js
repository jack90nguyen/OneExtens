document.addEventListener('DOMContentLoaded', () => {
  const btnAutofill = document.getElementById('btn-autofill');
  const btnSettings = document.getElementById('btn-settings');

  if (btnAutofill) {
    btnAutofill.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: "TRIGGER_AUTOFILL" });
      window.close();
    });
  }

  if (btnSettings) {
    btnSettings.addEventListener('click', () => {
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        window.open(chrome.runtime.getURL('options/options.html'));
      }
      window.close();
    });
  }
});
