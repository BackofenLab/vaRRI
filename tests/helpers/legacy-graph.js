import fs from 'node:fs';
import { JSDOM, ResourceLoader } from 'jsdom';

// Run the unmodified, pinned browser assets as an independent test oracle.
// The loader serves only these two local assets and never accesses the network.
class LocalVendors extends ResourceLoader {
  fetch(url) {
    const name = new URL(url).pathname;
    if (!['/fornac/d3.js', '/fornac/fornac.js'].includes(name)) return null;
    return Promise.resolve(fs.readFileSync(new URL('../..' + name, import.meta.url)));
  }
}

export async function legacyGraph(structure, positions) {
  const dom = new JSDOM('<div id="rna"></div>' +
    '<script src="http://localhost/fornac/d3.js"></script>' +
    '<script src="http://localhost/fornac/fornac.js"></script>', {
    runScripts: 'dangerously', resources: new LocalVendors(),
  });
  try {
    await new Promise(resolve => dom.window.addEventListener('load', resolve));
    const container = new dom.window.fornac.FornaContainer('#rna', { animation: false });
    container.addRNA(structure, {
      sequence: 'A'.repeat(structure.length), positions, labelInterval: 0,
    });
    container.force.stop();
    return Object.values(container.rnas)[0];
  } finally {
    dom.window.close();
  }
}
