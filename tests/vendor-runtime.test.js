import { execFileSync } from 'node:child_process';
import { JSDOM } from 'jsdom';
import getD3 from '../src/core/vendor/d3.js';

test('the native core and D3 adapter import without reading browser globals', () => {
  const core = new URL('../src/core/index.js', import.meta.url).href;
  const adapter = new URL('../src/core/vendor/d3.js', import.meta.url).href;
  const code = `
    for (const name of ['window', 'document']) {
      Object.defineProperty(globalThis, name, {
        get() { throw new Error('Unexpected browser global: ' + name); }
      });
    }
    const core = await import(${JSON.stringify(core)});
    const { default: getD3 } = await import(${JSON.stringify(adapter)});
    if (typeof core.createVaRRI !== 'function' || typeof getD3 !== 'function') {
      throw new Error('The native API is missing');
    }
  `;
  expect(() => execFileSync(process.execPath, ['--input-type=module', '-e', code], {
    encoding: 'utf8',
  })).not.toThrow();
});

test('D3 caches within each Document and keeps selections and globals isolated', () => {
  const first = new JSDOM('<svg></svg>');
  const second = new JSDOM('<svg></svg>');
  try {
    const firstD3 = getD3(first.window.document);
    const secondD3 = getD3(second.window.document);
    expect(getD3(first.window.document)).toBe(firstD3);
    expect(secondD3).not.toBe(firstD3);
    firstD3.select('svg').attr('data-owner', 'first');
    secondD3.select('svg').attr('data-owner', 'second');
    expect(first.window.document.querySelector('svg').getAttribute('data-owner')).toBe('first');
    expect(second.window.document.querySelector('svg').getAttribute('data-owner')).toBe('second');
    expect(first.window.d3).toBeUndefined();
    expect(second.window.d3).toBeUndefined();
  } finally {
    first.window.close();
    second.window.close();
  }
});

test('the adapter rejects missing Documents before initializing the engine', () => {
  for (const document of [undefined, null, {}, { defaultView: null }]) {
    expect(() => getD3(document)).toThrow('The canvas needs a browser Document');
  }
});
