'use strict';

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const css = fs.readFileSync(path.resolve(__dirname, '../style.css'), 'utf8');
const apiDocs = fs.readFileSync(path.resolve(__dirname, '../src/README.md'), 'utf8');
const pagesWorkflow = fs.readFileSync(path.resolve(__dirname, '../.github/workflows/pages.yml'), 'utf8');
const testWorkflow = fs.readFileSync(path.resolve(__dirname, '../.github/workflows/test.yml'), 'utf8');
const packageConfig = require('../package.json');
import vaRRI from '../src/vaRRI.js';

describe('UI document structure', () => {

  test('serves native modules without compiling the viewer', () => {
    expect(html).toContain('<script type="module" src="src/main.js"></script>');
    const map = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]);
    expect(map.imports.varri).toBe('./src/core/index.js');
    expect(map.imports.vue).toContain('/vue@3.5.22/dist/vue.esm-browser.prod.js');
    expect(pagesWorkflow).toContain('uses: actions/upload-pages-artifact@v5');
    expect(pagesWorkflow).not.toContain('esbuild');
    expect(pagesWorkflow).not.toContain('sed -i');
  });

  test('runs the complete test suite with an environment diagnostic', () => {
    expect(packageConfig.jest.globalSetup).toBe('<rootDir>/tests/jest-global-setup.js');
    expect(testWorkflow).toMatch(/run:\s+npm test -- --runInBand/);
    expect(testWorkflow).not.toMatch(/jest\s+tests\/vaRRI\.test\.js/);
  });

  test('keeps behavior and presentation out of the HTML', () => {
    expect(html).not.toMatch(/\son[a-z]+="/i);
    expect(html).not.toMatch(/\sstyle="/i);
  });

  test('keeps example options out of the static HTML', () => {
    expect(html).toContain('<details id="exampleDropdown" class="example-dropdown">');
    expect(html).toMatch(/<summary[^>]+aria-labelledby="exampleDropdownLabel selectedExampleName"/);
    expect(html).toContain('id="exampleDropdownOptions"');
    expect(html).not.toMatch(/\bdata-example=/);
  });

  test('uses unique element IDs', () => {
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('gives every repeated landmark a unique accessible name', () => {
    const asideLabels = [...html.matchAll(/<aside\b[^>]*\baria-label="([^"]+)"/g)]
      .map(match => match[1]);
    const asideCount = (html.match(/<aside\b/g) || []).length;

    expect(asideLabels).toHaveLength(asideCount);
    expect(new Set(asideLabels).size).toBe(asideLabels.length);
  });

  test('uses standards-compliant form and void-element markup', () => {
    expect(html).not.toMatch(/<(?:input|img|link|meta)\b[^>]*\/>/i);
    expect(html).not.toMatch(/<input\b[^>]*type="number"[^>]*\bsize=/i);
    expect(html).not.toMatch(/<textarea\b[^>]*\bwrap="?off/i);
  });

  test('defines the extracted utility classes', () => {
    ['btn-secondary', 'checkbox-row-nested', 'cite-note', 'cropping-value'].forEach(className => {
      expect(css).toContain(`.${className}`);
    });
  });

  test('exposes the linear layout controls in their requested order', () => {
    expect(html).toMatch(
      /id="forceLayoutLinearStructure"[\s\S]*?<label for="forceLayoutLinearStructure">Linear intramolecular stem layout<\/label>/
    );
    expect(html).toMatch(
      /id="forceLayoutLinearRRI"[\s\S]*?<label for="forceLayoutLinearRRI">Linear horizontal RRI layout<\/label>/
    );
    expect(html.indexOf('id="forceLayoutLinearRRI"'))
      .toBeLessThan(html.indexOf('id="forceLayoutLinearStructure"'));
  });

  test('documents every public API function', () => {
    const exportedFunctions = Object.keys(vaRRI).filter(key => typeof vaRRI[key] === 'function');
    expect(exportedFunctions.length).toBeGreaterThan(0);

    exportedFunctions.forEach(functionName => {
      expect(apiDocs).toContain(functionName);
    });
  });
});
