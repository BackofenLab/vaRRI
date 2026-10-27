import { JSDOM } from 'jsdom';
import { createVaRRI } from '../src/core/index.js';

test('mutation labels at interaction ends do not inherit the endpoint ring', async () => {
  const dom = new JSDOM('<div id="rna"></div>');
  const api = createVaRRI({ document: dom.window.document });
  try {
    const validated = api.validate({
      sequence: 'ACGU&UGCA',
      structure: '((..&..))',
      pointMutations: [{ sequence: '1', position: 1, replacement: 'G', color: '#008000' }],
    });

    await api.render('rna', validated);

    const mutationGroup = dom.window.document.querySelector('[label_gnum="1"]');
    const mutationMarker = mutationGroup.querySelector('circle');
    const mutationLabel = mutationGroup.querySelector('[label_type="label"]');
    const otherEndpointMarker = dom.window.document.querySelector('[label_gnum="8"] circle');
    const nucleotide = dom.window.document.querySelector('circle[node_type="nucleotide"][node_num="1"]');

    expect(mutationLabel.textContent).toBe('G');
    expect(mutationMarker.style.stroke).toBe('');
    expect(nucleotide.style.stroke).toBe('#008000');
    expect(otherEndpointMarker.style.stroke).toBe('red');
  } finally {
    api.cancelActiveRender();
    dom.window.close();
  }
});
