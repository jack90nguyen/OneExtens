(function () {
  const FIELD_HINT_MAP = {
    email: ["email", "e-mail", "mail"],
    phone: ["phone", "mobile", "tel", "contact"],
    address: ["address", "street", "city", "zip", "postal"],
    company: ["company", "organization", "business", "employer"],
    url: ["url", "website", "homepage", "site", "link"],
    text: ["name", "fullname", "full-name", "first", "last", "customer", "person"],
    number: ["quantity", "qty", "amount", "price", "age", "count"],
    search: ["search", "query", "keyword"]
  };

  function getFieldHintText(field) {
    const parts = [
      field.name,
      field.id,
      field.placeholder,
      field.getAttribute("aria-label"),
      field.getAttribute("autocomplete")
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return parts;
  }

  function matchByHint(hintText) {
    for (const [type, keywords] of Object.entries(FIELD_HINT_MAP)) {
      for (const keyword of keywords) {
        if (hintText.includes(keyword)) {
          return type;
        }
      }
    }
    return "text";
  }

  function detectFieldType(field) {
    if (!field || !(field instanceof Element)) {
      return "text";
    }

    if (field instanceof HTMLTextAreaElement) {
      return "paragraph";
    }

    if (field instanceof HTMLSelectElement) {
      return "select";
    }

    if (field instanceof HTMLInputElement) {
      const inputType = (field.type || "text").toLowerCase();
      const directTypes = new Set([
        "email",
        "password",
        "number",
        "tel",
        "url",
        "search",
        "checkbox",
        "radio",
        "date"
      ]);

      if (directTypes.has(inputType)) {
        if (inputType === "tel") return "phone";
        return inputType;
      }
    }

    return matchByHint(getFieldHintText(field));
  }

  window.__autofillDetector = window.__autofillDetector || {};
  window.__autofillDetector.detectFieldType = detectFieldType;
})();
