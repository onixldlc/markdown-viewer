/* Markdown Renderer — vanilla JS
   Dependencies (loaded via CDN in index.html):
     - marked         https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.2/marked.min.js
     - highlight.js   https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js
   To go fully offline, download those two files (plus the two hljs theme CSS files
   and the Google Fonts) into this folder and point the <link>/<script> tags at them. */

const app = (() => {
  const SAMPLE = [
    '# Markdown Renderer',
    '',
    'A fast, **GitHub-flavored** Markdown viewer. Drop a `.md` file anywhere on the page to render it.',
    '',
    '## Features',
    '',
    '- Drag & drop file loading',
    '- Syntax-highlighted code blocks',
    '- Outline navigation & reading stats',
    '- Light / dark themes',
    '',
    '### Task list',
    '',
    '- [x] Parse GitHub-flavored Markdown',
    '- [x] Highlight fenced code',
    '- [ ] Ship it',
    '',
    '## Code',
    '',
    '```js',
    'function greet(name) {',
    '  return `Hello, ${name}!`;',
    '}',
    'console.log(greet("world"));',
    '```',
    '',
    '## Table',
    '',
    '| Syntax     | Support |',
    '| ---------- | :-----: |',
    '| Tables     | yes     |',
    '| Task lists | yes     |',
    '| Footnotes  | no      |',
    '',
    '> Tip: use the tabs above to compare **source** and **preview**.',
    '',
    'Learn more at [the CommonMark spec](https://commonmark.org).'
  ].join('\n');

  const state = { rawText: SAMPLE, fileName: 'welcome.md', tab: 'preview', theme: 'dark' };

  // --- element refs
  const $ = (id) => document.getElementById(id);
  let els = {};
  let copyTimer = null;

  if (window.marked) marked.setOptions({ gfm: true, breaks: false });

  // --- markdown helpers
  function computeToc(text) {
    const lines = text.split('\n');
    let inFence = false, idx = 0;
    const out = [];
    for (const line of lines) {
      if (/^\s*```/.test(line)) { inFence = !inFence; continue; }
      if (inFence) continue;
      const m = /^(#{1,3})\s+(.+?)\s*#*$/.exec(line);
      if (m) { out.push({ id: 'md-h-' + idx, level: m[1].length, text: m[2].trim() }); idx++; }
    }
    return out;
  }

  function parse(text) { return window.marked ? marked.parse(text) : text; }

  // --- rendering
  function renderPreview() {
    const el = els.preview;
    el.innerHTML = parse(state.rawText);
    el.querySelectorAll('h1,h2,h3').forEach((h, i) => { h.id = 'md-h-' + i; });
    if (window.hljs) el.querySelectorAll('pre code').forEach((b) => { try { hljs.highlightElement(b); } catch (e) {} });
  }

  function renderSource() {
    const frag = document.createDocumentFragment();
    state.rawText.split('\n').forEach((line, i) => {
      const row = document.createElement('div');
      row.className = 'source__line';
      const n = document.createElement('span');
      n.className = 'source__n'; n.textContent = i + 1;
      const t = document.createElement('span');
      t.className = 'source__t'; t.textContent = line.length ? line : ' ';
      row.appendChild(n); row.appendChild(t);
      frag.appendChild(row);
    });
    els.source.innerHTML = '';
    els.source.appendChild(frag);
  }

  function renderToc() {
    const toc = computeToc(state.rawText);
    els.toc.innerHTML = '';
    if (!toc.length) {
      const d = document.createElement('div');
      d.className = 'toc__empty'; d.textContent = 'No headings found';
      els.toc.appendChild(d);
      return;
    }
    toc.forEach((it) => {
      const b = document.createElement('button');
      b.className = 'toc__item lvl-' + it.level;
      b.textContent = it.text;
      b.onclick = () => scrollTo(it.id);
      els.toc.appendChild(b);
    });
  }

  function renderStats() {
    const text = state.rawText;
    const words = (text.trim().match(/\S+/g) || []).length;
    $('st-words').textContent = words;
    $('st-read').textContent = Math.max(1, Math.round(words / 220));
    $('st-chars').textContent = text.length;
    $('st-lines').textContent = text.split('\n').length;
    $('st-heads').textContent = computeToc(text).length;
  }

  function render() {
    const isEmpty = state.rawText.trim() === '';
    const isPreview = state.tab === 'preview';

    $('filename').textContent = state.fileName;
    $('tab-preview').classList.toggle('is-active', isPreview);
    $('tab-source').classList.toggle('is-active', !isPreview);
    $('st-mode').textContent = isPreview ? 'PREVIEW' : 'SOURCE';
    $('theme-glyph').innerHTML = state.theme === 'dark' ? '&#9790;' : '&#9728;';
    $('st-theme').textContent = state.theme;
    $('copy-label').textContent = 'Copy HTML';

    els.empty.hidden = !isEmpty;
    els.preview.hidden = isEmpty || !isPreview;
    els.source.hidden = isEmpty || isPreview;

    renderToc();
    renderStats();
    if (!isEmpty && isPreview) renderPreview();
    if (!isEmpty && !isPreview) renderSource();
  }

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    const d = $('hl-dark'), l = $('hl-light');
    if (d && l) { const dark = state.theme === 'dark'; d.disabled = !dark; l.disabled = dark; }
  }

  // --- file loading
  function loadFile(file) {
    const r = new FileReader();
    r.onload = () => { state.rawText = String(r.result || ''); state.fileName = file.name; state.tab = 'preview'; render(); };
    r.readAsText(file);
  }

  // --- public actions
  const api = {
    setTab(tab) { state.tab = tab; render(); },
    toggleTheme() { state.theme = state.theme === 'dark' ? 'light' : 'dark'; applyTheme(); render(); },
    openFile() { $('file').click(); },
    onFileChange(e) { const f = e.target.files && e.target.files[0]; if (f) loadFile(f); e.target.value = ''; },
    onDragOver(e) { e.preventDefault(); $('overlay').hidden = false; },
    onDragLeave(e) { if (e.target === e.currentTarget) $('overlay').hidden = true; },
    onDrop(e) {
      e.preventDefault(); $('overlay').hidden = true;
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) loadFile(f);
    },
    copyHtml() {
      const html = parse(state.rawText);
      if (navigator.clipboard) navigator.clipboard.writeText(html);
      $('copy-label').textContent = 'Copied \u2713';
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => { $('copy-label').textContent = 'Copy HTML'; }, 1400);
    },
    exportHtml() {
      const body = parse(state.rawText);
      const name = (state.fileName || 'document').replace(/\.[^.]+$/, '');
      const doc = '<!doctype html><html><head><meta charset="utf-8"><title>' + name + '</title>' +
        '<style>body{font-family:-apple-system,system-ui,sans-serif;line-height:1.7;max-width:820px;margin:40px auto;padding:0 20px;color:#1f2328}' +
        'pre{background:#f6f8fa;padding:16px;border-radius:8px;overflow:auto}code{font-family:ui-monospace,monospace}' +
        'table{border-collapse:collapse}th,td{border:1px solid #d0d7de;padding:8px 13px}blockquote{border-left:3px solid #6ea8fe;margin:0;padding:0 1em;color:#656d76}</style>' +
        '</head><body>' + body + '</body></html>';
      const blob = new Blob([doc], { type: 'text/html' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name + '.html';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }
  };

  function scrollTo(id) {
    const go = () => {
      const c = els.scroll;
      const t = c.querySelector('#' + id);
      if (t) c.scrollTop = t.offsetTop - 16;
    };
    if (state.tab !== 'preview') { state.tab = 'preview'; render(); setTimeout(go, 30); }
    else go();
  }

  // --- init
  function init() {
    els = { preview: $('preview'), source: $('source'), toc: $('toc'), scroll: $('scroll'), empty: $('empty') };
    applyTheme();
    render();
    // marked/hljs may still be loading from CDN; re-render once ready
    if (!window.marked || !window.hljs) {
      const wait = setInterval(() => {
        if (window.marked && window.hljs) {
          clearInterval(wait);
          marked.setOptions({ gfm: true, breaks: false });
          render();
        }
      }, 80);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return api;
})();
