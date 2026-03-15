const runButton = document.getElementById("runAutofill");
const statusEl = document.getElementById("status");
const saveButton = document.getElementById("saveDataset");
const restoreButton = document.getElementById("restoreDefaults");

const datasetFields = {
  text: document.getElementById("namesInput"),
  email: document.getElementById("emailsInput"),
  phone: document.getElementById("phonesInput"),
  address: document.getElementById("addressesInput"),
  company: document.getElementById("companiesInput"),
  url: document.getElementById("urlsInput"),
  paragraph: document.getElementById("paragraphInput"),
  minWords: document.getElementById("minWordsInput"),
  maxWords: document.getElementById("maxWordsInput")
};

const STORAGE_KEY = "autofill_dataset";
const dataApi = window.__autofillData || {};

const DEFAULT_DATASETS = {
  text: ["John Smith", "Alice Johnson", "Michael Chen", "Nguyen Van A"],
  email: ["john@example.com", "alice@test.com"],
  company: ["Acme Inc", "Globex Corp", "Stark Industries"],
  address: ["123 Main St", "45 Nguyen Hue", "221B Baker Street"],
  phone: ["+84901234567", "+14155550123"],
  url: ["https://example.com", "https://testsite.io", "https://github.com"],
  paragraph:
    "Large paragraph text used for textarea generation. This source text is sliced into random lengths to make UI testing look natural.",
  minWords: 10,
  maxWords: 40
};

function setStatus(text) {
  if (statusEl) {
    statusEl.textContent = text;
  }
}

function toLines(list) {
  if (!Array.isArray(list)) return "";
  return list.join("\n");
}

function parseLines(value) {
  return String(value || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeNumber(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(3, Math.min(200, Math.floor(n)));
}

function setFormValues(datasets) {
  datasetFields.text.value = toLines(datasets.text);
  datasetFields.email.value = toLines(datasets.email);
  datasetFields.phone.value = toLines(datasets.phone);
  datasetFields.address.value = toLines(datasets.address);
  datasetFields.company.value = toLines(datasets.company);
  datasetFields.url.value = toLines(datasets.url);
  datasetFields.paragraph.value = datasets.paragraph || "";
  datasetFields.minWords.value = String(datasets.minWords || 10);
  datasetFields.maxWords.value = String(datasets.maxWords || 40);
}

function getFormValues() {
  const minWords = normalizeNumber(datasetFields.minWords.value, 10);
  const maxWords = normalizeNumber(datasetFields.maxWords.value, 40);

  return {
    text: parseLines(datasetFields.text.value),
    email: parseLines(datasetFields.email.value),
    phone: parseLines(datasetFields.phone.value),
    address: parseLines(datasetFields.address.value),
    company: parseLines(datasetFields.company.value),
    url: parseLines(datasetFields.url.value),
    paragraph: String(datasetFields.paragraph.value || "").trim(),
    minWords: Math.min(minWords, maxWords),
    maxWords: Math.max(minWords, maxWords)
  };
}

function readDatasetsFromStorage() {
  if (typeof dataApi.getEffectiveDatasets === "function") {
    return dataApi.getEffectiveDatasets();
  }

  if (typeof dataApi.loadUserConfig === "function") {
    return dataApi.loadUserConfig().then((config) => {
      if (config && config.datasets) {
        return { ...DEFAULT_DATASETS, ...config.datasets };
      }
      return DEFAULT_DATASETS;
    });
  }

  return new Promise((resolve) => {
    chrome.storage.sync.get(STORAGE_KEY, (result) => {
      const stored = result && result[STORAGE_KEY] ? result[STORAGE_KEY] : null;
      if (!stored || typeof stored !== "object" || !stored.datasets) {
        resolve(DEFAULT_DATASETS);
        return;
      }
      resolve(stored.datasets);
    });
  });
}

function writeDatasetsToStorage(datasets) {
  if (typeof dataApi.saveUserConfig === "function") {
    return dataApi.saveUserConfig(datasets);
  }

  return new Promise((resolve) => {
    const payload = {
      version: 1,
      datasets
    };

    chrome.storage.sync.set({ [STORAGE_KEY]: payload }, () => {
      resolve(!chrome.runtime.lastError);
    });
  });
}

async function loadDatasetEditor() {
  const datasets = await readDatasetsFromStorage();
  setFormValues({ ...DEFAULT_DATASETS, ...datasets });
}

async function saveDatasetEditor() {
  const datasets = getFormValues();
  const ok = await writeDatasetsToStorage(datasets);
  if (ok) {
    setStatus("Dataset saved.");
  } else {
    setStatus("Failed to save dataset.");
  }
}

async function restoreDefaults() {
  const ok =
    typeof dataApi.restoreDefaultConfig === "function"
      ? await dataApi.restoreDefaultConfig()
      : await writeDatasetsToStorage(DEFAULT_DATASETS);
  if (!ok) {
    setStatus("Failed to restore defaults.");
    return;
  }

  const refreshed = await readDatasetsFromStorage();
  setFormValues(refreshed);
  setStatus("Default dataset restored.");
}

async function sendAutofillMessage() {
  setStatus("Scanning fields...");
  runButton.disabled = true;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      setStatus("No active tab found.");
      return;
    }

    const response = await chrome.tabs.sendMessage(tab.id, { type: "RUN_AUTOFILL" });
    if (!response?.ok) {
      setStatus(`Error: ${response?.error || "Autofill failed"}`);
      return;
    }

    const { scanned, eligible, filled } = response.result;
    setStatus(`Done. scanned=${scanned}, eligible=${eligible}, filled=${filled}`);
  } catch (_error) {
    setStatus("Unable to run on this page. Reload tab if needed.");
  } finally {
    runButton.disabled = false;
  }
}

runButton.addEventListener("click", sendAutofillMessage);
saveButton.addEventListener("click", saveDatasetEditor);
restoreButton.addEventListener("click", restoreDefaults);

loadDatasetEditor();
