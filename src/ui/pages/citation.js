import { formatCitation } from './citation-format.js';

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/BackofenLab/vaRRI/main/';

const TABS_CONFIG = {
  bibtex: { label: 'BibTeX', filename: 'CITATION.bib', mime: 'text/plain', source: 'CITATION.bib', type: 'raw' },
  cff:    { label: 'CFF',    filename: 'CITATION.cff', mime: 'text/yaml',  source: 'CITATION.cff', type: 'raw' },
  apa:    { label: 'APA',    filename: 'citation.txt', mime: 'text/plain', source: 'CITATION.bib', type: 'parsed', style: 'apa' },
  ieee:   { label: 'IEEE',   filename: 'citation.txt', mime: 'text/plain', source: 'CITATION.bib', type: 'parsed', style: 'ieee' },
  ris:    { label: 'RIS',    filename: 'citation.ris', mime: 'application/x-research-info-systems', source: 'CITATION.bib', type: 'parsed', style: 'ris' }
};

const dataStore = {};
let currentTab = 'bibtex';

async function initialize() {
  document.querySelectorAll('.tab-btn[data-tab]').forEach(button => {
    button.addEventListener('click', () => switchTab(button.dataset.tab));
  });
  buildTabStructure();
  await Promise.all([
    loadFileWithFallback('CITATION.bib'),
    loadFileWithFallback('CITATION.cff')
  ]);
  renderTabContent(currentTab);
}

initialize();

async function loadFileWithFallback(filename) {
  try {
    const response = await fetch(filename);
    if (!response.ok) throw new Error(`Status ${response.status}`);
    dataStore[filename] = await response.text();
    return;
  } catch (localErr) {
    console.warn(`Lokaler Aufruf für "${filename}" fehlgeschlagen. Versuche Fallback...`);
  }

  try {
    const response = await fetch(GITHUB_RAW_BASE + filename);
    if (!response.ok) throw new Error(`GitHub Status ${response.status}`);
    dataStore[filename] = await response.text();
  } catch (githubErr) {
    dataStore[filename] = `[Fehler: Datei "${filename}" konnte nicht geladen werden.]`;
  }
}

function buildTabStructure() {
  const container = document.getElementById('tab-contents');
  container.innerHTML = '';
  Object.keys(TABS_CONFIG).forEach(key => {
    const conf = TABS_CONFIG[key];
    const tabDiv = document.createElement('div');
    tabDiv.id = `content-${key}`;
    tabDiv.className = `tab-content ${key === currentTab ? 'active' : ''}`;
    tabDiv.innerHTML = `
      <div class="action-bar">
        <button class="btn btn-sm" data-download="${key}" style="background:#1d7fa4; color:#fff;">
          💾 ${conf.label} herunterladen
        </button>
      </div>
      <pre id="pre-${key}" class="citation-pre">Wird geladen...</pre>
    `;
    tabDiv.querySelector('[data-download]').addEventListener('click', () => downloadTabContent(key));
    container.appendChild(tabDiv);
  });
}

function renderTabContent(tabKey) {
  const conf = TABS_CONFIG[tabKey];
  const preElem = document.getElementById(`pre-${tabKey}`);
  
  if (conf.type === 'raw') {
    preElem.textContent = dataStore[conf.source] || 'Kein Inhalt verfügbar.';
  } else if (conf.type === 'parsed') {
    const rawBib = dataStore[conf.source];
    if (!rawBib || rawBib.startsWith('[Fehler')) {
      preElem.textContent = 'Zitationsdaten konnten nicht geladen werden.';
      return;
    }
    preElem.textContent = formatCitation(rawBib, conf.style);
  }
}

function switchTab(tabKey) {
  currentTab = tabKey;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabKey);
  });
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `content-${tabKey}`);
  });
  renderTabContent(tabKey);
}

function downloadTabContent(tabKey) {
  const conf = TABS_CONFIG[tabKey];
  const text = document.getElementById(`pre-${tabKey}`).textContent;
  const blob = new Blob([text], { type: `${conf.mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = conf.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
