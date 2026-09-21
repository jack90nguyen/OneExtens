function setEmpty(text) {
  const empty = document.getElementById("empty");
  empty.hidden = false;
  empty.textContent = text;
}

function renderCapture(capture) {
  const image = document.getElementById("shot");
  const info = document.getElementById("info");
  const button = document.getElementById("btn-download");

  image.src = capture.dataUrl;
  image.hidden = false;
  document.getElementById("empty").hidden = true;
  info.textContent = `${capture.width} × ${capture.height} px · ${capture.pageUrl}`;
  document.title = capture.fileName;

  if (capture.truncated) {
    const warning = document.getElementById("warning");
    warning.hidden = false;
    warning.textContent = "Page was too tall for a single image, so the bottom part was cut off.";
  }

  button.disabled = false;
  button.addEventListener("click", () => {
    const link = document.createElement("a");
    link.href = capture.dataUrl;
    link.download = capture.fileName;
    link.click();
  });
}

chrome.runtime
  .sendMessage({ type: "GET_CAPTURE" })
  .then((response) => {
    if (!response || !response.ok || !response.result) {
      setEmpty("No screenshot available. Please capture the page again.");
      return;
    }
    renderCapture(response.result);
  })
  .catch(() => {
    setEmpty("No screenshot available. Please capture the page again.");
  });
