(function () {
  const STORAGE_KEY = "autofill_dataset";

  const DEFAULT_DATASETS = {
    text: [
      "John Smith",
      "Alice Johnson",
      "Michael Chen",
      "Nguyen Van A",
      "Sophia Patel",
      "Lucas Martin",
      "Emma Davis",
      "Noah Wilson",
      "Olivia Brown",
      "Liam Anderson",
      "Ava Thompson",
      "Ethan Clark",
      "Mia Rodriguez",
      "Daniel Lee",
      "Charlotte Kim",
      "William Taylor",
      "Amelia Scott",
      "James Nguyen",
      "Harper Walker",
      "Benjamin Young"
    ],
    email: [
      "john.smith@example.com",
      "alice.johnson@test.com",
      "michael.chen@demo.io",
      "nguyen.vana@mailhub.dev",
      "sophia.patel@acme.org",
      "lucas.martin@sample.net",
      "emma.davis@testing.co",
      "noah.wilson@mockmail.app",
      "olivia.brown@qa-cloud.com",
      "liam.anderson@frontend.dev",
      "ava.thompson@playground.io",
      "ethan.clark@staging.dev",
      "mia.rodriguez@autotest.ai",
      "daniel.lee@apitest.me",
      "charlotte.kim@preview.site",
      "william.taylor@formcheck.dev",
      "amelia.scott@uibot.net",
      "james.nguyen@testrun.co",
      "harper.walker@scenario.org",
      "benjamin.young@verify.app"
    ],
    company: [
      "Acme Inc",
      "Globex Corp",
      "Stark Industries",
      "Wayne Enterprises",
      "Initech",
      "Umbrella Labs",
      "Wonka Manufacturing",
      "Hooli",
      "Pied Piper",
      "Aperture Science",
      "Blue Origin Labs",
      "Nova Systems",
      "Summit Dynamics",
      "Beacon Solutions",
      "Vertex Works",
      "Atlas Holdings",
      "Luna Tech",
      "Riverstone Group",
      "Cedar Analytics",
      "Orchid Networks"
    ],
    address: [
      "123 Main St, Springfield",
      "45 Nguyen Hue, District 1",
      "221B Baker Street, London",
      "742 Evergreen Terrace, Springfield",
      "1600 Amphitheatre Parkway, Mountain View",
      "350 Fifth Avenue, New York",
      "1 Infinite Loop, Cupertino",
      "77 King Street, Sydney",
      "12 Orchard Road, Singapore",
      "8 Rue de Rivoli, Paris",
      "5 Shibuya Crossing, Tokyo",
      "11 Queen Street, Auckland",
      "90 Collins Street, Melbourne",
      "210 Lakeshore Drive, Chicago",
      "19 Palm Avenue, Miami",
      "56 Cedar Lane, Toronto",
      "88 Sunset Boulevard, Los Angeles",
      "14 Harbor Road, Seattle",
      "9 Riverside Walk, Dublin",
      "33 Maple Street, Boston"
    ],
    phone: [
      "+1 415 555 0123",
      "(415) 555-0188",
      "0901234567",
      "+84 901 234 567",
      "+44 20 7946 0958",
      "+61 2 9374 4000",
      "+65 6123 4567",
      "+81 3 1234 5678",
      "+33 1 42 68 53 00",
      "+49 30 123456",
      "+1 212 555 0162",
      "(312) 555-0174",
      "+1 646 555 0131",
      "+84 905 888 999",
      "0987654321",
      "+1 510 555 0110",
      "(206) 555-0149",
      "+1 718 555 0197",
      "+84 932 456 789",
      "+1 408 555 0127"
    ],
    url: [
      "https://example.com",
      "https://testsite.io",
      "https://github.com",
      "https://developer.chrome.com",
      "https://docs.example.org",
      "https://demo.app",
      "https://staging.service.net",
      "https://sandbox.portal.dev",
      "https://company.co",
      "https://frontend.tools",
      "https://api.sample.io",
      "https://preview.site",
      "https://myproduct.app",
      "https://qa-environment.dev",
      "https://landing.page",
      "https://form-test.net",
      "https://client-portal.co",
      "https://support.example.com",
      "https://catalog.store",
      "https://status.service.io"
    ],
    paragraph:
      "This sample paragraph is designed to create realistic textarea content for automated interface testing and user acceptance checks. The objective is to produce natural looking text that resembles feedback, project notes, and customer comments without repeating the same phrase every time a field is populated. Teams often review layouts with long messages to verify spacing, line wrapping, scrolling behavior, and truncation rules in cards, dialogs, and responsive forms. During test cycles, engineers also need enough variety in text length to evaluate how validation messages and helper labels behave on different screen sizes. A consistent but expressive paragraph source helps detect overlap issues, hidden controls, and awkward padding in complex components that include tooltips, accordions, and sticky headers. This content intentionally includes plain language and neutral business terms so it fits common workflows such as onboarding, checkout, support, registration, and profile management. When a tester triggers autofill, the generator can select a random window of words from this source to mimic user generated input with different sentence fragments. That variation is useful when observing animation timing, character counters, autosave indicators, and markdown previews in web applications. Product teams can also compare snapshots from visual regression tools to ensure form areas remain stable when content density changes across locales and viewport widths. In practical scenarios, a tester may open a modal, submit a draft, reopen the same modal, and run autofill again to verify that only visible fields are updated while background forms remain untouched. This behavior is especially important in single page applications where multiple routes and detached panels can coexist in memory at the same time. Reliable randomized text also improves exploratory testing for accessibility by exposing focus transitions, announcement order, and contrast boundaries around active inputs. By using a broad paragraph foundation with many words, the extension can generate concise notes for short fields and longer narratives for message boxes without depending on external services. The result is faster manual QA, clearer bug reproduction, and better confidence that forms behave correctly under realistic user input patterns in modern frontend stacks.",
    minWords: 10,
    maxWords: 40
  };

  const FALLBACK_DATASETS = {
    text: ["test user"],
    email: ["test@example.com"],
    company: ["Example Company"],
    address: ["123 Test Street"],
    phone: ["+10000000000"],
    url: ["https://example.com"],
    paragraph: "Test content for textarea field generation.",
    minWords: 8,
    maxWords: 20
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function toCleanList(value) {
    if (Array.isArray(value)) {
      const items = value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean);
      return Array.from(new Set(items));
    }

    if (typeof value === "string") {
      const lines = value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);
      return Array.from(new Set(lines));
    }

    return [];
  }

  function normalizeWordCount(value, fallback) {
    const num = Number(value);
    if (!Number.isFinite(num)) {
      return fallback;
    }

    const bounded = Math.max(3, Math.min(200, Math.floor(num)));
    return bounded;
  }

  function normalizeDatasets(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const paragraph = typeof source.paragraph === "string" ? source.paragraph.trim() : "";

    const minWords = normalizeWordCount(source.minWords, DEFAULT_DATASETS.minWords);
    const maxWords = normalizeWordCount(source.maxWords, DEFAULT_DATASETS.maxWords);

    return {
      text: toCleanList(source.text),
      email: toCleanList(source.email),
      company: toCleanList(source.company),
      address: toCleanList(source.address),
      phone: toCleanList(source.phone),
      url: toCleanList(source.url),
      paragraph,
      minWords: Math.min(minWords, maxWords),
      maxWords: Math.max(minWords, maxWords)
    };
  }

  function chooseListValue(userValue, defaultValue, fallbackValue) {
    if (Array.isArray(userValue) && userValue.length) return userValue;
    if (Array.isArray(defaultValue) && defaultValue.length) return defaultValue;
    return fallbackValue;
  }

  function mergeWithDefaults(userDatasets) {
    const user = normalizeDatasets(userDatasets);

    return {
      text: chooseListValue(user.text, DEFAULT_DATASETS.text, FALLBACK_DATASETS.text),
      email: chooseListValue(user.email, DEFAULT_DATASETS.email, FALLBACK_DATASETS.email),
      company: chooseListValue(user.company, DEFAULT_DATASETS.company, FALLBACK_DATASETS.company),
      address: chooseListValue(user.address, DEFAULT_DATASETS.address, FALLBACK_DATASETS.address),
      phone: chooseListValue(user.phone, DEFAULT_DATASETS.phone, FALLBACK_DATASETS.phone),
      url: chooseListValue(user.url, DEFAULT_DATASETS.url, FALLBACK_DATASETS.url),
      paragraph: user.paragraph || DEFAULT_DATASETS.paragraph || FALLBACK_DATASETS.paragraph,
      minWords: normalizeWordCount(user.minWords, DEFAULT_DATASETS.minWords),
      maxWords: normalizeWordCount(user.maxWords, DEFAULT_DATASETS.maxWords)
    };
  }

  function getSyncStorage() {
    if (typeof chrome === "undefined") {
      return null;
    }

    return chrome.storage && chrome.storage.sync ? chrome.storage.sync : null;
  }

  function loadUserConfig() {
    return new Promise((resolve) => {
      const storage = getSyncStorage();
      if (!storage) {
        resolve({ version: 1, datasets: {} });
        return;
      }

      storage.get(STORAGE_KEY, (result) => {
        const stored = result && result[STORAGE_KEY] ? result[STORAGE_KEY] : null;
        if (!stored || typeof stored !== "object") {
          resolve({ version: 1, datasets: {} });
          return;
        }

        resolve({
          version: Number(stored.version) || 1,
          datasets: normalizeDatasets(stored.datasets)
        });
      });
    });
  }

  function saveUserConfig(datasets) {
    return new Promise((resolve) => {
      const storage = getSyncStorage();
      if (!storage) {
        resolve(false);
        return;
      }

      const payload = {
        version: 1,
        datasets: normalizeDatasets(datasets)
      };

      storage.set({ [STORAGE_KEY]: payload }, () => {
        resolve(!chrome.runtime.lastError);
      });
    });
  }

  function restoreDefaultConfig() {
    return saveUserConfig(clone(DEFAULT_DATASETS));
  }

  async function getEffectiveDatasets() {
    const config = await loadUserConfig();
    return mergeWithDefaults(config.datasets);
  }

  window.__autofillData = window.__autofillData || {};
  window.__autofillData.STORAGE_KEY = STORAGE_KEY;
  window.__autofillData.DEFAULT_DATASETS = clone(DEFAULT_DATASETS);
  window.__autofillData.FALLBACK_DATASETS = clone(FALLBACK_DATASETS);
  window.__autofillData.normalizeDatasets = normalizeDatasets;
  window.__autofillData.mergeWithDefaults = mergeWithDefaults;
  window.__autofillData.loadUserConfig = loadUserConfig;
  window.__autofillData.saveUserConfig = saveUserConfig;
  window.__autofillData.restoreDefaultConfig = restoreDefaultConfig;
  window.__autofillData.getEffectiveDatasets = getEffectiveDatasets;
})();
