(() => {
  "use strict";

  const MAX_SOURCE_LENGTH = 2097152;
  const STYLE_ID = "__onex-md-style";
  const ROOT_ID = "__onex-md-root";

  const state = { pre: null, root: null };

  function isMarkdownDocument() {
    const type = document.contentType || "";
    if (type === "text/markdown" || type === "text/x-markdown") {
      return true;
    }
    return type === "text/plain" && /\.(md|markdown)$/i.test(location.pathname);
  }

  function escapeHtml(text) {
    return text.replace(/[&<>"]/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;"
    })[char]);
  }

  // Markdown is untrusted input: keep anything but a known-safe scheme out of
  // href/src. A relative path has no scheme at all and stays as written.
  function safeUrl(raw) {
    const url = raw.trim();
    const scheme = url.match(/^([a-z][a-z0-9+.-]*):/i);
    if (!scheme) {
      return url;
    }
    return /^(https?|mailto|file)$/i.test(scheme[1]) ? url : "#";
  }

  function link(href, label) {
    return `<a href="${safeUrl(href)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  }

  function applyEmphasis(text) {
    return text
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/__([^_]+)__/g, "<strong>$1</strong>")
      .replace(/~~([^~]+)~~/g, "<del>$1</del>")
      .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
      .replace(/(^|[^_\w])_([^_\n]+)_/g, "$1<em>$2</em>");
  }

  // Finished tags are parked behind placeholders before emphasis runs. Without
  // that, a URL carrying underscores gets chewed up inside its own href.
  function renderInline(text) {
    const codes = [];
    const tags = [];

    let out = text.replace(/`([^`]+)`/g, (match, code) => {
      codes.push(code);
      return `\u0000${codes.length - 1}\u0000`;
    });

    out = escapeHtml(out);

    const keepTag = (html) => {
      tags.push(html);
      return `\u0001${tags.length - 1}\u0001`;
    };

    out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, alt, src) => keepTag(`<img src="${safeUrl(src)}" alt="${alt}">`));
    out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, href) => keepTag(link(href, applyEmphasis(label))));
    out = out.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, (m, lead, url) => `${lead}${keepTag(link(url, url))}`);

    out = applyEmphasis(out);

    out = out.replace(/\u0001(\d+)\u0001/g, (m, index) => tags[Number(index)]);
    out = out.replace(/\u0000(\d+)\u0000/g, (m, index) => `<code>${escapeHtml(codes[Number(index)])}</code>`);
    return out;
  }

  function listItemOf(line) {
    const match = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
    if (!match) {
      return null;
    }
    return {
      indent: match[1].length,
      ordered: /\d/.test(match[2]),
      text: match[3]
    };
  }

  // Nested lists are emitted as siblings rather than inside the parent <li>.
  // Tags stay balanced and the indent renders the same, which is enough here.
  function renderList(items) {
    const html = [];
    const stack = [];

    for (const item of items) {
      const level = item.indent >= 2 ? 1 : 0;
      const tag = item.ordered ? "ol" : "ul";

      while (stack.length > level + 1) {
        html.push(`</${stack.pop()}>`);
      }
      if (stack.length === level + 1 && stack[level] !== tag) {
        html.push(`</${stack.pop()}>`);
      }
      while (stack.length < level + 1) {
        stack.push(tag);
        html.push(`<${tag}>`);
      }

      html.push(`<li>${renderInline(item.text)}</li>`);
    }

    while (stack.length) {
      html.push(`</${stack.pop()}>`);
    }
    return html.join("");
  }

  function renderTable(header, rows) {
    const cells = (line) => line.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((cell) => cell.trim());
    const head = cells(header).map((cell) => `<th>${renderInline(cell)}</th>`).join("");
    const body = rows
      .map((row) => `<tr>${cells(row).map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`)
      .join("");
    return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
  }

  function renderMarkdown(source) {
    const lines = source.replace(/\r\n?/g, "\n").split("\n");
    const html = [];
    let index = 0;

    while (index < lines.length) {
      const line = lines[index];

      const fence = line.match(/^\s*```(\S*)\s*$/);
      if (fence) {
        const code = [];
        index += 1;
        while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) {
          code.push(lines[index]);
          index += 1;
        }
        index += 1;
        html.push(`<pre class="md-code"><code>${escapeHtml(code.join("\n"))}</code></pre>`);
        continue;
      }

      const heading = line.match(/^(#{1,6})\s+(.*)$/);
      if (heading) {
        const level = heading[1].length;
        html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
        index += 1;
        continue;
      }

      if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
        html.push("<hr>");
        index += 1;
        continue;
      }

      if (/^\s*>\s?/.test(line)) {
        const quote = [];
        while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
          quote.push(lines[index].replace(/^\s*>\s?/, ""));
          index += 1;
        }
        html.push(`<blockquote>${renderMarkdown(quote.join("\n"))}</blockquote>`);
        continue;
      }

      if (line.includes("|") && index + 1 < lines.length && /^\s*\|?[\s:|-]*-[\s:|-]*$/.test(lines[index + 1])) {
        const header = line;
        const rows = [];
        index += 2;
        while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
          rows.push(lines[index]);
          index += 1;
        }
        html.push(renderTable(header, rows));
        continue;
      }

      if (listItemOf(line)) {
        const items = [];
        while (index < lines.length && listItemOf(lines[index])) {
          items.push(listItemOf(lines[index]));
          index += 1;
        }
        html.push(renderList(items));
        continue;
      }

      if (!line.trim()) {
        index += 1;
        continue;
      }

      const paragraph = [];
      while (index < lines.length && lines[index].trim() && !/^\s*(#{1,6}\s|>|```)/.test(lines[index]) && !listItemOf(lines[index])) {
        paragraph.push(lines[index]);
        index += 1;
      }
      html.push(`<p>${renderInline(paragraph.join("\n"))}</p>`);
    }

    return html.join("\n");
  }

  const STYLE_TEXT = `
#${ROOT_ID} {
  max-width: 860px;
  margin: 0 auto;
  padding: 32px 24px 80px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 1.7;
  color: #1f2328;
  overflow-wrap: break-word;
}
#${ROOT_ID} h1, #${ROOT_ID} h2, #${ROOT_ID} h3,
#${ROOT_ID} h4, #${ROOT_ID} h5, #${ROOT_ID} h6 { line-height: 1.3; margin: 1.6em 0 0.6em; }
#${ROOT_ID} h1 { font-size: 2em; padding-bottom: 0.3em; border-bottom: 1px solid #d8dee4; }
#${ROOT_ID} h2 { font-size: 1.5em; padding-bottom: 0.3em; border-bottom: 1px solid #d8dee4; }
#${ROOT_ID} h3 { font-size: 1.25em; }
#${ROOT_ID} p, #${ROOT_ID} ul, #${ROOT_ID} ol, #${ROOT_ID} table, #${ROOT_ID} blockquote { margin: 0 0 1em; }
#${ROOT_ID} ul, #${ROOT_ID} ol { padding-left: 1.8em; }
#${ROOT_ID} li { margin: 0.25em 0; }
#${ROOT_ID} a { color: #0969da; }
#${ROOT_ID} code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.88em;
  padding: 0.18em 0.4em;
  border-radius: 5px;
  background: rgba(129, 139, 152, 0.18);
}
#${ROOT_ID} pre.md-code {
  padding: 14px 16px;
  border-radius: 8px;
  overflow-x: auto;
  background: #f6f8fa;
  border: 1px solid #d8dee4;
}
#${ROOT_ID} pre.md-code code { padding: 0; background: none; font-size: 0.86em; }
#${ROOT_ID} blockquote {
  padding: 0.2em 1em;
  border-left: 4px solid #d0d7de;
  color: #59636e;
}
#${ROOT_ID} table { border-collapse: collapse; display: block; overflow-x: auto; }
#${ROOT_ID} th, #${ROOT_ID} td { padding: 7px 14px; border: 1px solid #d0d7de; }
#${ROOT_ID} th { background: #f6f8fa; text-align: left; }
#${ROOT_ID} hr { height: 1px; border: 0; background: #d0d7de; margin: 2em 0; }
#${ROOT_ID} img { max-width: 100%; }
@media (prefers-color-scheme: dark) {
  #${ROOT_ID} { color: #e6edf3; }
  #${ROOT_ID} h1, #${ROOT_ID} h2 { border-bottom-color: #3d444d; }
  #${ROOT_ID} a { color: #4493f8; }
  #${ROOT_ID} pre.md-code { background: #161b22; border-color: #3d444d; }
  #${ROOT_ID} blockquote { border-left-color: #3d444d; color: #9198a1; }
  #${ROOT_ID} th, #${ROOT_ID} td { border-color: #3d444d; }
  #${ROOT_ID} th { background: #161b22; }
  #${ROOT_ID} hr { background: #3d444d; }
}
`;

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
    return { pre, text };
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
    root.innerHTML = renderMarkdown(source.text);

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

  window.__autofillMarkdown = {
    isMarkdownDocument,
    renderMarkdown,
    enable,
    disable,
    toggle
  };

  if (isMarkdownDocument()) {
    enable();
  }
})();
