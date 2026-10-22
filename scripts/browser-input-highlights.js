import assert from 'node:assert/strict';
import path from 'node:path';

async function expectMarks(page, expected) {
  await page.waitForFunction(expected => Object.entries(expected).every(([id, marks]) => {
    const actual = { caret: [], partner: [] };
    let offset = 0;
    for (const span of document.querySelectorAll(`#highlights-${id} span`)) {
      for (const kind of ['caret', 'partner']) {
        if (span.classList.contains(`hl-${kind}`)) actual[kind].push(offset);
      }
      offset += span.textContent.length;
    }
    return JSON.stringify(actual) === JSON.stringify(marks);
  }), expected);
}

const both = (caret, partner = []) => Object.fromEntries(
  ['sequence', 'structure'].map(id => [id, { caret, partner }]),
);

export async function checkInputHighlights(page, output) {
  const sequence = page.locator('#sequence'), structure = page.locator('#structure');
  // Mouse placement, followed by native keyboard caret movement and selection.
  const position = await sequence.evaluate(input => {
    const css = getComputedStyle(input);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = `${css.fontSize} ${css.fontFamily}`;
    return { x: parseFloat(css.paddingLeft) + context.measureText('A').width * 1.1,
      y: parseFloat(css.paddingTop) + parseFloat(css.lineHeight) / 2 };
  });
  await sequence.click({ position });
  await expectMarks(page, both([0], [8]));
  await sequence.press('ArrowRight');
  await expectMarks(page, both([1], [7]));
  await page.getByRole('complementary', { name: 'Sequence and structure input', exact: true })
    .screenshot({ path: path.join(output, 'input-highlights.png') });
  const fills = await page.locator('#highlights-sequence').evaluate(overlay => {
    return ['hl-caret', 'hl-partner', 'hl-seq1'].map(name =>
      getComputedStyle(overlay.querySelector('.' + name)).backgroundColor);
  });
  assert.equal(new Set(fills).size, 3, 'Caret, partner, and strand colors must be distinct');
  await sequence.press('Shift+ArrowRight');
  await expectMarks(page, both([]));
  await sequence.press('Home');
  await expectMarks(page, both([]));

  // Editing the structure refreshes pairing even before the input is valid.
  await structure.fill('((..&..)');
  await expectMarks(page, both([7], [1]));
  await structure.press(')');
  await expectMarks(page, both([8], [0]));
  await structure.press('Backspace');
  await expectMarks(page, both([7], [1]));
  await structure.press(')');
  await sequence.fill('ACG');
  await expectMarks(page, both([2]));
  await structure.focus();
  await structure.press('End');
  await expectMarks(page, {
    sequence: { caret: [], partner: [0] }, structure: { caret: [8], partner: [0] },
  });
  await structure.press('Tab');
  await expectMarks(page, both([]));

  // Long, wrapped inputs retain the existing resize and scroll alignment.
  await structure.fill('(' + '.'.repeat(798) + ')');
  await sequence.fill('A'.repeat(800));
  await expectMarks(page, both([799], [0]));
  await sequence.press('ArrowLeft');
  await sequence.press('ArrowRight');
  await page.waitForFunction(() => {
    const input = document.getElementById('sequence');
    const backdrop = document.getElementById('backdrop-sequence');
    return input.scrollTop > 0 && Math.abs(input.scrollTop - backdrop.scrollTop) < 1;
  });
  await sequence.evaluate(input => { input.style.height = '110px'; });
  await page.waitForFunction(() => document.getElementById('backdrop-sequence').offsetHeight === 110);
  const geometry = await sequence.evaluate(input => {
    const backdrop = document.getElementById('backdrop-sequence');
    const highlight = document.querySelector('#highlights-sequence .hl-caret').getBoundingClientRect();
    const bounds = input.getBoundingClientRect();
    return { inputHeight: input.scrollHeight, backdropHeight: backdrop.scrollHeight,
      inside: highlight.top >= bounds.top && highlight.bottom <= bounds.bottom,
      spans: backdrop.querySelectorAll('span').length };
  });
  assert.ok(Math.abs(geometry.inputHeight - geometry.backdropHeight) < 2, 'Overlay wraps at the textarea columns');
  assert.ok(geometry.inside, 'The highlighted character stays visible beside the scrolled caret');
  assert.ok(geometry.spans < 10, 'Long input uses spans only at highlight boundaries');
  await page.locator('#clearAllBtn').click();
  await expectMarks(page, both([]));
  assert.equal(await sequence.inputValue(), '');
}
