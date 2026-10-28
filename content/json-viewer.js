(() => {
  "use strict";

  const MAX_SOURCE_LENGTH = 2097152;
  const STYLE_ID = "__onex-json-style";
  const ROOT_ID = "__onex-json-root";

  const STYLE_TEXT = `
#${ROOT_ID} {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  line-height: 1.55;
  padding: 28px 16px 16px;
  white-space: pre-wrap;
  word-break: break-word;
}
#${ROOT_ID} summary { cursor: pointer; list-style: none; }
#${ROOT_ID} summary::-webkit-details-marker { display: none; }
#${ROOT_ID} summary::before {
  content: "\\25B8";
  display: inline-block;
  width: 1em;
  margin-left: -1em;
  opacity: 0.55;
}
#${ROOT_ID} details[open] > summary::before { content: "\\25BE"; }
#${ROOT_ID} .onex-json-children { margin-left: 1.5em; }
#${ROOT_ID} .onex-json-line, #${ROOT_ID} .onex-json-closing { padding-left: 1em; }
#${ROOT_ID} details[open] > summary > .onex-json-ellipsis,
#${ROOT_ID} details[open] > summary > .onex-json-close,
#${ROOT_ID} details[open] > summary > .onex-json-count { display: none; }
#${ROOT_ID} .onex-json-key { color: #0b4fa8; }
#${ROOT_ID} .onex-json-string { color: #0a6b2e; }
#${ROOT_ID} .onex-json-number { color: #a4440a; }
#${ROOT_ID} .onex-json-boolean { color: #6b21a8; }
#${ROOT_ID} .onex-json-null { color: #b3261e; }
#${ROOT_ID} .onex-json-punct, #${ROOT_ID} .onex-json-ellipsis { color: #1f2328; }
#${ROOT_ID} .onex-json-count { color: #6e7781; font-style: italic; }
#${ROOT_ID} .onex-json-link { color: #0a6b2e; text-decoration: underline; text-underline-offset: 2px; }
#${ROOT_ID} .onex-json-link:hover { color: #0b4fa8; }
@media (prefers-color-scheme: dark) {
  #${ROOT_ID} .onex-json-key { color: #8ecbff; }
  #${ROOT_ID} .onex-json-string { color: #6ee787; }
  #${ROOT_ID} .onex-json-number { color: #ffa657; }
  #${ROOT_ID} .onex-json-boolean { color: #d2a8ff; }
  #${ROOT_ID} .onex-json-null { color: #ff7b72; }
  #${ROOT_ID} .onex-json-punct, #${ROOT_ID} .onex-json-ellipsis { color: #c9d1d9; }
  #${ROOT_ID} .onex-json-count { color: #8b949e; }
  #${ROOT_ID} .onex-json-link { color: #6ee787; }
  #${ROOT_ID} .onex-json-link:hover { color: #8ecbff; }
}
`;

  const state = {
    pre: null,
    root: null
  };

  function isJsonDocument() {
    const type = document.contentType || "";
    if (type.includes("json")) {
      return true;
    }
    return type === "text/plain" && /\.json$/i.test(location.pathname);
  }

  function span(className, text) {
    const element = document.createElement("span");
    element.className = className;
    element.textContent = text;
    return element;
  }

  function typeOf(value) {
    if (value === null) {
      return "null";
    }
    if (Array.isArray(value)) {
      return "array";
    }
    return typeof value;
  }

  function keyPart(key) {
    return [span("onex-json-key", JSON.stringify(String(key))), span("onex-json-punct", ": ")];
  }

  // Only http(s) becomes a link: JSON content is untrusted page data, and an
  // explicit scheme check keeps anything like javascript: out of href.
  function isLinkValue(value) {
    return typeof value === "string" && /^https?:\/\//i.test(value);
  }

  function linkPart(value) {
    const anchor = document.createElement("a");
    anchor.className = "onex-json-link";
    anchor.href = value;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.textContent = value;
    return anchor;
  }

  function primitivePart(value) {
    const type = typeOf(value);
    if (type !== "string") {
      return [span(`onex-json-${type}`, String(value))];
    }

    if (isLinkValue(value)) {
      const quote = () => span("onex-json-string", '"');
      return [quote(), linkPart(value), quote()];
    }

    return [span("onex-json-string", JSON.stringify(value))];
  }

  function plainLine(key, parts) {
    const line = document.createElement("div");
    line.className = "onex-json-line";
    if (key !== null) {
      line.append(...keyPart(key));
    }
    line.append(...parts);
    return line;
  }

  function renderEntry(key, value, isLast) {
    const type = typeOf(value);
    const comma = isLast ? "" : ",";

    if (type !== "object" && type !== "array") {
      return plainLine(key, [...primitivePart(value), span("onex-json-punct", comma)]);
    }

    const entries = type === "array"
      ? value.map((item, index) => [index, item])
      : Object.entries(value);
    const open = type === "array" ? "[" : "{";
    const close = type === "array" ? "]" : "}";

    if (entries.length === 0) {
      return plainLine(key, [span("onex-json-punct", open + close + comma)]);
    }

    const details = document.createElement("details");
    details.open = true;

    const summary = document.createElement("summary");
    if (key !== null) {
      summary.append(...keyPart(key));
    }
    summary.append(
      span("onex-json-punct", open),
      span("onex-json-ellipsis", " … "),
      span("onex-json-close", close + comma),
      span("onex-json-count", ` // ${entries.length} ${entries.length === 1 ? "item" : "items"}`)
    );
    details.append(summary);

    const children = document.createElement("div");
    children.className = "onex-json-children";
    entries.forEach(([childKey, childValue], index) => {
      const childName = type === "array" ? null : childKey;
      children.append(renderEntry(childName, childValue, index === entries.length - 1));
    });
    details.append(children);

    const closing = document.createElement("div");
    closing.className = "onex-json-closing";
    closing.append(span("onex-json-punct", close + comma));
    details.append(closing);

    return details;
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = STYLE_TEXT;
    document.documentElement.appendChild(style);
  }

  function readSource() {
    const pre = document.body && document.body.querySelector("pre");
    if (!pre) {
      return null;
    }

    const text = pre.textContent || "";
    if (!text.trim() || text.length > MAX_SOURCE_LENGTH) {
      return null;
    }

    try {
      return { pre, data: JSON.parse(text) };
    } catch (error) {
      return null;
    }
  }

  function enable() {
    if (state.root) {
      return true;
    }

    const source = readSource();
    if (!source) {
      return false;
    }

    injectStyle();
    const root = document.createElement("div");
    root.id = ROOT_ID;
    root.append(renderEntry(null, source.data, true));

    source.pre.style.display = "none";
    document.body.appendChild(root);
    state.pre = source.pre;
    state.root = root;
    return true;
  }

  function disable() {
    if (!state.root) {
      return false;
    }

    state.root.remove();
    state.pre.style.display = "";
    state.root = null;
    state.pre = null;
    return true;
  }

  function toggle() {
    if (state.root) {
      disable();
      return { ok: true, active: false };
    }

    const rendered = enable();
    return { ok: rendered, active: rendered };
  }

  window.__autofillJson = {
    isJsonDocument,
    enable,
    disable,
    toggle
  };

  if (isJsonDocument()) {
    enable();
  }
})();
