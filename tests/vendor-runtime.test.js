import fs from 'node:fs';
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

test('the retained classic D3 URL preserves its browser global and engine version', () => {
  const legacy = new JSDOM('<svg></svg>', { runScripts: 'dangerously' });
  const native = new JSDOM('<svg></svg>');
  try {
    const script = legacy.window.document.createElement('script');
    script.textContent = fs.readFileSync(new URL('../fornac/d3.js', import.meta.url), 'utf8');
    legacy.window.document.body.appendChild(script);
    const oldD3 = legacy.window.d3;
    const coreD3 = getD3(native.window.document);
    expect(oldD3.version).toBe('3.4.13');
    expect(coreD3.version).toBe('7.9.0');
    oldD3.select('svg').append('circle').attr('r', 7);
    expect(legacy.window.document.querySelector('circle').getAttribute('r')).toBe('7');
    const values = [-4, 0, 0.25, 1, 8];
    const oldScale = oldD3.scale.linear().domain([-4, 8]).range([0, 120]);
    const coreScale = coreD3.scaleLinear().domain([-4, 8]).range([0, 120]);
    expect(values.map(coreScale)).toEqual(values.map(oldScale));
  } finally {
    legacy.window.close();
    native.window.close();
  }
});
