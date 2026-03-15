(function () {
  const FIELD_SELECTOR = "input, textarea, select";
  const MODAL_SELECTORS = [
    '[role="dialog"]',
    '[aria-modal="true"]',
    ".modal",
    ".ant-modal",
    ".MuiDialog-root"
  ];

  function dispatchFieldEvents(element) {
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function shouldSkipSelectOption(option) {
    if (!option || option.disabled) {
      return true;
    }

    const value = String(option.value || "").trim().toLowerCase();
    const label = String(option.textContent || "").trim().toLowerCase();
    if (!value) {
      return true;
    }

    const placeholderTerms = ["select", "choose", "please select", "--select--"];
    return placeholderTerms.some((term) => label === term || value === term);
  }

  function pickRandomSelectableIndex(select, randomApi) {
    const indexes = [];
    for (let i = 0; i < select.options.length; i += 1) {
      if (!shouldSkipSelectOption(select.options[i])) {
        indexes.push(i);
      }
    }

    if (!indexes.length) {
      return -1;
    }

    const pick = randomApi && typeof randomApi.randomItem === "function" ? randomApi.randomItem(indexes) : indexes[0];
    return Number.isFinite(pick) ? pick : indexes[0];
  }

  function setInputValue(input, radioState, context) {
    const detectedType = context.detectFieldType(input);
    const rawType = (input.type || "text").toLowerCase();

    if (rawType === "hidden" || rawType === "file") {
      return false;
    }

    if (detectedType === "checkbox") {
      const nextChecked = context.randomBoolean();
      if (input.checked !== nextChecked) {
        input.checked = nextChecked;
        dispatchFieldEvents(input);
      }
      return true;
    }

    if (detectedType === "radio") {
      const groupName = input.name || `__no_name__${radioState.unnamedIndex++}`;
      if (radioState.processedGroups.has(groupName)) {
        return false;
      }

      radioState.processedGroups.add(groupName);
      const scope = input.form || document;
      const group = input.name
        ? Array.from(scope.querySelectorAll('input[type="radio"]')).filter((el) => {
            if (!(el instanceof HTMLInputElement)) return false;
            if (el.name !== input.name) return false;
            return shouldFill(el);
          })
        : [input];

      const chosen = group.length ? context.randomItem(group) : input;
      if (chosen && chosen instanceof HTMLInputElement && !chosen.checked) {
        chosen.checked = true;
        dispatchFieldEvents(chosen);
      }
      return true;
    }

    const nextValue = context.generateValue(detectedType, {
      field: input,
      sessionCache: context.sessionCache
    });
    if (input.value !== nextValue) {
      input.value = nextValue;
      dispatchFieldEvents(input);
    }
    return true;
  }

  function setFieldValue(field, radioState, context) {
    if (field instanceof HTMLInputElement) {
      return setInputValue(field, radioState, context);
    }

    if (field instanceof HTMLTextAreaElement) {
      const nextValue = context.generateValue("paragraph", {
        field,
        sessionCache: context.sessionCache
      });
      if (field.value !== nextValue) {
        field.value = nextValue;
        dispatchFieldEvents(field);
      }
      return true;
    }

    if (field instanceof HTMLSelectElement) {
      if (!field.options.length) {
        return false;
      }

      const nextIndex = pickRandomSelectableIndex(field, context.randomApi);
      if (nextIndex < 0) {
        return false;
      }

      if (field.selectedIndex !== nextIndex) {
        field.selectedIndex = nextIndex;
        dispatchFieldEvents(field);
      }
      return true;
    }

    return false;
  }

  function shouldFill(field) {
    if (!(field instanceof Element)) {
      return false;
    }

    if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
      if (field.readOnly) {
        return false;
      }
    }

    const utils = window.__autofillUtils || {};
    const visible = typeof utils.isVisible === "function" ? utils.isVisible(field) : false;
    const interactable = typeof utils.isInteractable === "function" ? utils.isInteractable(field) : false;
    const inViewport = typeof utils.isInViewport === "function" ? utils.isInViewport(field) : false;

    return visible && interactable && inViewport;
  }

  function getTargetFields(allFields) {
    const eligible = allFields.filter(shouldFill);
    if (!eligible.length) {
      return [];
    }

    const modals = document.querySelectorAll(MODAL_SELECTORS.join(","));
    if (!modals.length) {
      return eligible;
    }

    const modalFields = eligible.filter((field) => {
      for (const modal of modals) {
        if (modal.contains(field)) {
          return true;
        }
      }
      return false;
    });

    return modalFields.length ? modalFields : eligible;
  }

  async function runAutofill() {
    const fields = Array.from(document.querySelectorAll(FIELD_SELECTOR));
    const targetFields = getTargetFields(fields);

    const dataApi = window.__autofillData || {};
    const detectorApi = window.__autofillDetector || {};
    const randomApi = window.__autofillRandom || {};

    const datasets =
      typeof dataApi.getEffectiveDatasets === "function"
        ? await dataApi.getEffectiveDatasets()
        : {
            text: ["test"],
            email: ["test@example.com"],
            company: ["Example Company"],
            address: ["123 Test Street"],
            phone: ["+10000000000"],
            url: ["https://example.com"],
            paragraph: "test content",
            minWords: 10,
            maxWords: 40
          };

    const sessionCache = {
      text: new Set(),
      email: new Set(),
      phone: new Set(),
      company: new Set(),
      address: new Set(),
      url: new Set()
    };

    const context = {
      sessionCache,
      randomApi,
      detectFieldType: (field) =>
        typeof detectorApi.detectFieldType === "function" ? detectorApi.detectFieldType(field) : "text",
      randomBoolean: () =>
        typeof randomApi.randomBoolean === "function" ? randomApi.randomBoolean() : Math.random() >= 0.5,
      randomItem: (list) =>
        typeof randomApi.randomItem === "function" ? randomApi.randomItem(list) : (Array.isArray(list) ? list[0] : null),
      generateValue: (type, meta) => {
        if (typeof randomApi.generateValue === "function") {
          return randomApi.generateValue(type, datasets, meta || {});
        }

        if (type === "email") return datasets.email[0] || "test@example.com";
        if (type === "password") return "123456";
        if (type === "number") return "123";
        if (type === "phone") return datasets.phone[0] || "+10000000000";
        if (type === "url") return datasets.url[0] || "https://example.com";
        if (type === "company") return datasets.company[0] || "Example Company";
        if (type === "address") return datasets.address[0] || "123 Test Street";
        if (type === "paragraph") return "test content";
        return datasets.text[0] || "test";
      }
    };

    const radioState = {
      processedGroups: new Set(),
      unnamedIndex: 0
    };

    let filledCount = 0;
    for (const field of targetFields) {
      if (setFieldValue(field, radioState, context)) {
        filledCount += 1;
      }
    }

    return {
      scanned: fields.length,
      eligible: targetFields.length,
      filled: filledCount
    };
  }

  window.__autofillExtension = window.__autofillExtension || {};
  window.__autofillExtension.runAutofill = runAutofill;
})();
