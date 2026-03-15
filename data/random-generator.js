(function () {
  function randomInt(min, max) {
    const lower = Math.ceil(Math.min(min, max));
    const upper = Math.floor(Math.max(min, max));
    return Math.floor(Math.random() * (upper - lower + 1)) + lower;
  }

  function randomBoolean() {
    return Math.random() >= 0.5;
  }

  function randomItem(list) {
    if (!Array.isArray(list) || !list.length) {
      return "";
    }
    return list[randomInt(0, list.length - 1)];
  }

  function shuffle(list) {
    const arr = Array.isArray(list) ? list.slice() : [];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = randomInt(0, i);
      const temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }
    return arr;
  }

  function sanitizeWords(paragraph) {
    return String(paragraph || "")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .filter(Boolean);
  }

  function generateParagraph(paragraphText, minWords, maxWords) {
    const words = sanitizeWords(paragraphText);
    if (!words.length) {
      return "test content";
    }

    const min = Math.max(1, Math.min(minWords || 10, maxWords || 40));
    const max = Math.max(min, maxWords || 40);
    const targetLength = Math.min(randomInt(min, max), words.length);
    const maxStart = Math.max(0, words.length - targetLength);
    const start = randomInt(0, maxStart);
    return words.slice(start, start + targetLength).join(" ");
  }

  function generateDateLastFiveYears() {
    const end = new Date();
    const start = new Date();
    start.setFullYear(end.getFullYear() - 5);

    const timestamp = randomInt(start.getTime(), end.getTime());
    const date = new Date(timestamp);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function generatePhoneValue(datasetPhones) {
    const formats = [
      () => `+1 ${randomInt(200, 999)} ${randomInt(100, 999)} ${randomInt(1000, 9999)}`,
      () => `(${randomInt(200, 999)}) ${randomInt(100, 999)}-${randomInt(1000, 9999)}`,
      () => `0${randomInt(80, 99)}${randomInt(1000000, 9999999)}`
    ];

    if (Array.isArray(datasetPhones) && datasetPhones.length && randomBoolean()) {
      return randomItem(datasetPhones);
    }

    return randomItem(formats)();
  }

  function generateEmailValue(nameSource, emailList) {
    if (Array.isArray(emailList) && emailList.length && randomBoolean()) {
      return randomItem(emailList);
    }

    const safeName = String(nameSource || "test user")
      .toLowerCase()
      .replace(/[^a-z\s]/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    const first = safeName[0] || "test";
    const last = safeName[1] || "user";
    const domains = ["testmail.com", "example.com", "qa.dev", "mailhub.io", "autotest.app"];
    return `${first}.${last}@${randomItem(domains)}`;
  }

  function getCacheSet(sessionCache, key) {
    if (!sessionCache[key]) {
      sessionCache[key] = new Set();
    }
    return sessionCache[key];
  }

  function pickUnique(candidate, typeKey, sessionCache, pool) {
    const cache = getCacheSet(sessionCache, typeKey);
    if (!cache.has(candidate)) {
      cache.add(candidate);
      return candidate;
    }

    const shuffled = shuffle(pool || []);
    for (const item of shuffled) {
      if (item && !cache.has(item)) {
        cache.add(item);
        return item;
      }
    }

    return candidate;
  }

  function readNumberRange(field) {
    const fieldMin = Number(field.min);
    const fieldMax = Number(field.max);
    const min = Number.isFinite(fieldMin) ? fieldMin : 1;
    const max = Number.isFinite(fieldMax) ? fieldMax : 999;
    if (min > max) {
      return { min: max, max: min };
    }
    return { min, max };
  }

  function generateValue(type, datasets, context) {
    const sessionCache = context.sessionCache || {};
    const field = context.field;

    if (type === "email") {
      const sourceName = randomItem(datasets.text);
      const candidate = generateEmailValue(sourceName, datasets.email);
      return pickUnique(candidate, "email", sessionCache, datasets.email);
    }

    if (type === "phone") {
      const candidate = generatePhoneValue(datasets.phone);
      return pickUnique(candidate, "phone", sessionCache, datasets.phone);
    }

    if (type === "address") {
      const candidate = randomItem(datasets.address);
      return pickUnique(candidate, "address", sessionCache, datasets.address);
    }

    if (type === "company") {
      const candidate = randomItem(datasets.company);
      return pickUnique(candidate, "company", sessionCache, datasets.company);
    }

    if (type === "url") {
      const candidate = randomItem(datasets.url);
      return pickUnique(candidate, "url", sessionCache, datasets.url);
    }

    if (type === "paragraph") {
      return generateParagraph(datasets.paragraph, datasets.minWords, datasets.maxWords);
    }

    if (type === "password") {
      return "123456";
    }

    if (type === "date") {
      return generateDateLastFiveYears();
    }

    if (type === "number") {
      const range = readNumberRange(field || {});
      return String(randomInt(range.min, range.max));
    }

    if (type === "search") {
      const words = ["test", "sample", "mock", "preview", "frontend", "automation"];
      return randomItem(words);
    }

    const candidate = randomItem(datasets.text) || "test";
    return pickUnique(candidate, "text", sessionCache, datasets.text);
  }

  window.__autofillRandom = window.__autofillRandom || {};
  window.__autofillRandom.randomItem = randomItem;
  window.__autofillRandom.randomInt = randomInt;
  window.__autofillRandom.randomBoolean = randomBoolean;
  window.__autofillRandom.shuffle = shuffle;
  window.__autofillRandom.generateParagraph = generateParagraph;
  window.__autofillRandom.generateValue = generateValue;
})();
