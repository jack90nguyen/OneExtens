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
  password: document.getElementById("passwordInput"),
  paragraph: document.getElementById("paragraphInput"),
  minWords: document.getElementById("minWordsInput"),
  maxWords: document.getElementById("maxWordsInput")
};

const dataApi = window.__autofillData || {};

const DEFAULT_DATASETS = {
  text: ["John Smith", "Alice Johnson", "Michael Chen", "Nguyen Van A"],
  email: ["john@example.com", "alice@test.com"],
  company: ["Acme Inc", "Globex Corp", "Stark Industries"],
  address: ["123 Main St", "45 Nguyen Hue", "221B Baker Street"],
  phone: ["+84901234567", "+14155550123"],
  url: ["https://example.com", "https://testsite.io", "https://github.com"],
  password: "123456",
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
  datasetFields.password.value = datasets.password || "123456";
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
    password: String(datasetFields.password.value || "").trim() || "123456",
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

  return Promise.resolve(DEFAULT_DATASETS);
}

function writeDatasetsToStorage(datasets) {
  if (typeof dataApi.saveUserConfig === "function") {
    return dataApi.saveUserConfig(datasets);
  }

  return Promise.resolve(false);
}

async function loadDatasetEditor() {
  try {
    const datasets = await readDatasetsFromStorage();
    setFormValues({ ...DEFAULT_DATASETS, ...datasets });
    setStatus("Ready");
  } catch (_error) {
    setStatus("Failed to load dataset.");
  }
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

saveButton.addEventListener("click", saveDatasetEditor);
restoreButton.addEventListener("click", restoreDefaults);

loadDatasetEditor();

/* ---------------------------------------------------------------------------
   Image background
   Kept separate from the dataset editor above: different storage key, its own
   status line, and no shared state beyond the storage helpers.
--------------------------------------------------------------------------- */

const paletteApi = window.__onexCheckerPalette || null;
const presetSelect = document.getElementById("checkerPreset");
const customRow = document.getElementById("customRow");
const baseInput = document.getElementById("checkerBase");
const tileInput = document.getElementById("checkerTile");
const previewEl = document.getElementById("checkerPreview");
const checkerStatusEl = document.getElementById("checkerStatus");
const saveCheckerButton = document.getElementById("saveChecker");
const restoreCheckerButton = document.getElementById("restoreChecker");

function setCheckerStatus(text) {
  if (checkerStatusEl) {
    checkerStatusEl.textContent = text;
  }
}

function currentPalette() {
  if (presetSelect.value === paletteApi.CUSTOM_ID) {
    return { id: paletteApi.CUSTOM_ID, base: baseInput.value, tile: tileInput.value };
  }

  return { id: presetSelect.value };
}

function renderPreview() {
  const css = paletteApi.toCss(currentPalette());
  for (const swatch of previewEl.querySelectorAll(".swatch")) {
    swatch.style.backgroundColor = css.backgroundColor;
    swatch.style.backgroundImage = css.backgroundImage;
    swatch.style.backgroundSize = css.backgroundSize;
    swatch.style.backgroundPosition = css.backgroundPosition;
  }

  customRow.hidden = presetSelect.value !== paletteApi.CUSTOM_ID;
}

function buildPresetOptions() {
  for (const preset of paletteApi.PRESETS) {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = `${preset.label} — ${preset.note}`;
    presetSelect.appendChild(option);
  }

  const custom = document.createElement("option");
  custom.value = paletteApi.CUSTOM_ID;
  custom.textContent = "Custom — pick your own two colours";
  presetSelect.appendChild(custom);
}

function setPaletteForm(palette) {
  presetSelect.value = palette.id;
  baseInput.value = palette.base;
  tileInput.value = palette.tile;
  renderPreview();
}

async function loadCheckerEditor() {
  try {
    setPaletteForm(await paletteApi.load());
    setCheckerStatus("Ready");
  } catch (_error) {
    setCheckerStatus("Failed to load background setting.");
  }
}

async function saveCheckerEditor() {
  const ok = await paletteApi.save(currentPalette());
  setCheckerStatus(ok ? "Background saved." : "Failed to save background.");
}

async function restoreCheckerDefault() {
  const ok = await paletteApi.save({ id: paletteApi.DEFAULT_ID });
  if (!ok) {
    setCheckerStatus("Failed to restore default background.");
    return;
  }

  setPaletteForm(await paletteApi.load());
  setCheckerStatus("Default background restored.");
}

if (paletteApi && presetSelect) {
  buildPresetOptions();
  presetSelect.addEventListener("change", renderPreview);
  baseInput.addEventListener("input", renderPreview);
  tileInput.addEventListener("input", renderPreview);
  saveCheckerButton.addEventListener("click", saveCheckerEditor);
  restoreCheckerButton.addEventListener("click", restoreCheckerDefault);
  loadCheckerEditor();
}
