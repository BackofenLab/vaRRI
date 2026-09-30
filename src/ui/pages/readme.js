import { Marked, Renderer } from '../vendor/marked.js';

const root = new URL('../../../', import.meta.url);
const guides = ['docs/viewer-guide.md', 'docs/sharing-and-input.md'];
const documents = ['README.md', ...guides];
const headingCounts = new Map();
const slugify = text => text.toLowerCase().trim()
  .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
const renderer = new Renderer();

renderer.heading = function ({ tokens, text, depth }) {
  const slug = slugify(text);
  const count = headingCounts.get(slug) || 0;
  headingCounts.set(slug, count + 1);
  const id = count ? `${slug}-${count}` : slug;
  return `<h${depth} id="${id}"><a href="#${id}" class="anchor-link" aria-label="Link to section"></a>${this.parser.parseInline(tokens)}</h${depth}>`;
};

const markdown = new Marked({ renderer });

async function readDocument(filename) {
  const response = await fetch(new URL(filename, root));
  if (!response.ok) throw new Error(`${filename}: HTTP ${response.status}`);
  return response.text();
}

function renderPart(source, filename) {
  const template = document.createElement('template');
  template.innerHTML = markdown.parse(source);
  const base = new URL(filename, root);
  for (const link of template.content.querySelectorAll('a[href]')) {
    const href = link.getAttribute('href');
    const url = new URL(href, base);
    const included = documents.some(file => new URL(file, root).pathname === url.pathname);
    if (href.startsWith('#') || (url.origin === root.origin && included && url.hash)) {
      link.setAttribute('href', `#${slugify(decodeURIComponent(url.hash.slice(1)))}`);
    } else if (!href.startsWith('#')) {
      link.setAttribute('href', url.href);
    }
  }
  for (const image of template.content.querySelectorAll('img[src]')) {
    image.src = new URL(image.getAttribute('src'), base).href;
  }
  return template.content;
}

function scrollToSection() {
  try {
    const id = slugify(decodeURIComponent(location.hash.slice(1)));
    document.getElementById(id)?.scrollIntoView();
  } catch {
    // A malformed external fragment must not prevent help from loading.
  }
}

async function showReadme() {
  const content = document.getElementById('markdown-text');
  try {
    const sources = await Promise.all(documents.map(readDocument));
    const fragment = document.createDocumentFragment();
    const parts = sources[0].split(/<!-- include: (docs\/[a-z-]+\.md) -->/);
    for (let index = 0; index < parts.length; index += 1) {
      if (index % 2 === 0) fragment.append(renderPart(parts[index], documents[0]));
      else {
        const documentIndex = documents.indexOf(parts[index]);
        if (documentIndex < 1) throw new Error(`Unknown help document: ${parts[index]}`);
        fragment.append(renderPart(sources[documentIndex], parts[index]));
      }
    }
    content.replaceChildren(fragment);
    scrollToSection();
    window.addEventListener('hashchange', scrollToSection);
  } catch (error) {
    content.textContent = `Error loading the README (${error.message}).`;
  }
}

showReadme();
