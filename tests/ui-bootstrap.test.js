const { mountViewer } = require('./helpers/vue-viewer.cjs');

test('boots through bound UI actions without inline handlers', async () => {
  const { dom, api: vaRRI, renderSpy, examples: catalog, flush, close } = await mountViewer();

  expect(renderSpy).toHaveBeenCalled();
  expect(document.getElementById('msg').textContent).toContain('Visualisation ready');
  expect(document.getElementById('sequence').value).not.toBe('');
  expect(document.getElementById('subseqCounterUI').textContent).toBe('(2)');
  expect(document.getElementById('regionCounterUI').textContent).toBe('(1)');
  expect(document.getElementById('mutationCounterUI').textContent).toBe('(2)');

  const inputPanel = document.querySelector('aside.control-panel > details');
  expect(inputPanel.open).toBe(true);
  const profilePanel = document.getElementById('profileData1').closest('details');
  expect(profilePanel.open).toBe(false);

  const dropdown = document.getElementById('exampleDropdown');
  const trigger = document.getElementById('exampleDropdownTrigger');
  const options = document.getElementById('exampleDropdownOptions');
  const exampleButtons = [...options.querySelectorAll('[data-example]')];

  expect(exampleButtons).toHaveLength(5);
  exampleButtons.forEach(button => {
    expect(button.querySelector('.example-option-name').textContent.trim()).not.toBe('');
    expect(button.querySelector('.example-option-description').textContent.trim()).not.toBe('');
  });

  const defaultButton = options.querySelector('[data-example="2mol"]');
  const defaultName = defaultButton.querySelector('.example-option-name').textContent;
  const defaultDescription = defaultButton.querySelector('.example-option-description').textContent;
  expect(document.getElementById('selectedExampleName').textContent).toBe(defaultName);
  expect(trigger.textContent.trim()).toBe(defaultName);
  expect(trigger.textContent).not.toContain(defaultDescription);
  expect(defaultButton.getAttribute('aria-current')).toBe('true');

  const freeTails = document.getElementById('forceLayoutFreeTails');
  const pullCrossing = document.getElementById('forceLayoutPullCrossing');
  const selectExample = async key => {
    dropdown.open = true;
    dropdown.dispatchEvent(new window.Event('toggle'));
    await flush();
    const button = options.querySelector(`[data-example="${key}"]`);
    button.click();
    await flush();
    return button;
  };

  freeTails.checked = true;
  freeTails.dispatchEvent(new window.Event('change'));
  pullCrossing.checked = true;
  pullCrossing.dispatchEvent(new window.Event('change'));
  await flush();

  const profileExample = catalog['coronel-tellez-2022'];
  const profileButton = await selectExample('coronel-tellez-2022');

  expect(dropdown.open).toBe(false);
  expect(document.activeElement).toBe(trigger);
  expect(trigger.textContent.trim()).toBe(profileExample.nameShort);
  expect(trigger.textContent).not.toContain(profileExample.descriptionShort);
  expect(profileButton.getAttribute('aria-current')).toBe('true');
  expect(document.getElementById('sequence').value).toBe(profileExample.vaRRIParams.sequence);
  expect(document.getElementById('structure').value).toBe(profileExample.vaRRIParams.structure);
  expect(document.getElementById('cropping').value).toBe('3');
  expect(document.getElementById('highlighting').value).toBe('basepairs');
  expect(document.getElementById('backgroundhighlighting').value).toBe('nothing');
  expect(document.getElementById('colorSeq1').value).toBe('#c9c1c9');
  expect(document.getElementById('colorSeq2').value).toBe('#c9c1c9');
  expect(document.getElementById('profileColor1').value).toBe('#ea373c');
  expect(document.getElementById('profileColor2').value).toBe('#ea373c');
  expect(document.getElementById('subseqCounterUI').textContent).toBe('(4)');
  expect(document.getElementById('regionCounterUI').textContent).toBe('');
  expect(document.getElementById('mutationCounterUI').textContent).toBe('');
  expect(document.getElementById('profileCounterUI').textContent).toBe('(2)');
  expect(inputPanel.open).toBe(true);
  expect(profilePanel.open).toBe(false);
  expect(document.getElementById('forceLayout').checked).toBe(false);
  expect(freeTails.checked).toBe(false);
  expect(freeTails.disabled).toBe(true);
  expect(pullCrossing.checked).toBe(false);
  expect(pullCrossing.disabled).toBe(true);

  const mutationExample = catalog['wu-2024'];
  const mutationButton = await selectExample('wu-2024');

  expect(trigger.textContent.trim()).toBe(mutationExample.nameShort);
  expect(mutationButton.getAttribute('aria-current')).toBe('true');
  expect(document.getElementById('sequence').value).toBe(mutationExample.vaRRIParams.sequence);
  expect(document.getElementById('structure').value).toBe(mutationExample.vaRRIParams.structure);
  expect(document.getElementById('startIndex1').value).toBe('-35');
  expect(document.getElementById('startIndex2').value).toBe('2');
  expect(document.getElementById('cropping').value).toBe('-1');
  expect(document.getElementById('coloring').value).toBe('strand');
  expect(document.getElementById('highlighting').value).toBe('region');
  expect(document.getElementById('backgroundhighlighting').value).toBe('basepairs');
  expect(document.getElementById('distinctBpTypes').checked).toBe(true);
  expect(document.getElementById('colorSeq1').value).toBe('#add8e6');
  expect(document.getElementById('profileData1').value).toBe('');
  expect(document.getElementById('profileData2').value).toBe('');
  expect(document.getElementById('subseqCounterUI').textContent).toBe('(1)');
  expect(document.getElementById('regionCounterUI').textContent).toBe('');
  expect(document.getElementById('mutationCounterUI').textContent).toBe('(4)');
  expect(document.getElementById('profileCounterUI').textContent).toBe('');

  await selectExample('2mol');
  expect(trigger.textContent.trim()).toBe(defaultName);
  expect(document.getElementById('subseqCounterUI').textContent).toBe('(2)');
  expect(document.getElementById('regionCounterUI').textContent).toBe('(1)');
  expect(document.getElementById('mutationCounterUI').textContent).toBe('(2)');
  expect(document.getElementById('profileCounterUI').textContent).toBe('(1)');

  dropdown.open = true;
  dropdown.dispatchEvent(new window.Event('toggle'));
  await flush();
  dropdown.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await flush();
  expect(dropdown.open).toBe(false);

  dropdown.open = true;
  dropdown.dispatchEvent(new window.Event('toggle'));
  await flush();
  document.body.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await flush();
  expect(dropdown.open).toBe(false);

  document.getElementById('clearAllBtn').click();
  await flush();
  expect(document.getElementById('sequence').value).toBe('');
  expect(document.getElementById('subseqCounterUI').textContent).toBe('');
  expect(document.getElementById('selectedExampleName').textContent).toBe('Select an example');
  expect(options.querySelectorAll('[aria-current="true"]')).toHaveLength(0);

  await close();
});

test('linear layout controls enable force, survive example loading, share, and forward render flags', async () => {
  const { dom, renderSpy, flush, close } = await mountViewer({
    modifyExamples(examples) {
      const featureOverview = examples['2mol'];
      examples['linear-test'] = {
        ...featureOverview,
        name: 'Linear layout test', nameShort: 'Linear layout test',
        descriptionShort: 'Exercises the linear RRI option.',
        vaRRIParams: { ...featureOverview.vaRRIParams, forceLayout: '0', forceLayoutLinearRRI: '1' },
      };
    },
  });
  const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

  const forceLayout = document.getElementById('forceLayout');
  const linearStructure = document.getElementById('forceLayoutLinearStructure');
  const linearRri = document.getElementById('forceLayoutLinearRRI');
  const options = document.getElementById('exampleDropdownOptions');

  expect(linearStructure.checked).toBe(false);
  expect(linearRri.checked).toBe(true);
  expect(linearStructure.disabled).toBe(false);
  expect(linearRri.disabled).toBe(false);

  options.querySelector('[data-example="linear-test"]').click();
  await flush();

  expect(forceLayout.checked).toBe(true);
  expect(linearStructure.checked).toBe(false);
  expect(linearRri.checked).toBe(true);
  expect(renderSpy).toHaveBeenLastCalledWith(
    expect.any(String),
    expect.any(Object),
    expect.objectContaining({
      forceLayout: true,
      forceLayoutLinearStructure: false,
      forceLayoutLinearRRI: true,
    })
  );

  options.querySelector('[data-example="2mol"]').click();
  await flush();
  expect(linearStructure.checked).toBe(false);
  expect(linearRri.checked).toBe(true);

  linearStructure.checked = true;
  linearStructure.dispatchEvent(new window.Event('change'));
  await flush();
  expect(forceLayout.checked).toBe(true);
  expect(renderSpy).toHaveBeenLastCalledWith(
    expect.any(String),
    expect.any(Object),
    expect.objectContaining({
      forceLayout: true,
      forceLayoutLinearStructure: true,
      forceLayoutLinearRRI: true,
    })
  );

  linearRri.checked = true;
  linearRri.dispatchEvent(new window.Event('change'));
  await flush();
  expect(forceLayout.checked).toBe(true);
  expect(renderSpy).toHaveBeenLastCalledWith(
    expect.any(String),
    expect.any(Object),
    expect.objectContaining({
      forceLayout: true,
      forceLayoutLinearStructure: true,
      forceLayoutLinearRRI: true,
    })
  );

  document.getElementById('openVarriBtn').click();
  await flush();
  const sharedUrl = new URL(openSpy.mock.calls.at(-1)[0]);
  expect(sharedUrl.searchParams.get('forceLayoutLinearStructure')).toBe('1');
  expect(sharedUrl.searchParams.get('forceLayoutLinearRRI')).toBe('1');

  forceLayout.checked = false;
  forceLayout.dispatchEvent(new window.Event('change'));
  await flush();
  expect(linearStructure.checked).toBe(false);
  expect(linearRri.checked).toBe(false);
  expect(linearStructure.disabled).toBe(false);
  expect(linearRri.disabled).toBe(false);
  expect(renderSpy).toHaveBeenLastCalledWith(
    expect.any(String),
    expect.any(Object),
    expect.objectContaining({
      forceLayout: false,
      forceLayoutLinearStructure: false,
      forceLayoutLinearRRI: false,
    })
  );

  await close();
});

test.each([
  'forceLayoutLinearStructure',
  'forceLayoutLinearRRI',
])('URL-loaded %s enables force layout before the initial render', async optionId => {
  const url = `http://localhost/?sequence=AAAA&structure=....&forceLayout=0&${optionId}=1`;
  const { renderSpy, close } = await mountViewer({ url });

  expect(document.getElementById(optionId).checked).toBe(true);
  expect(document.getElementById('forceLayout').checked).toBe(true);
  expect(renderSpy).toHaveBeenLastCalledWith(
    expect.any(String),
    expect.any(Object),
    expect.objectContaining({ forceLayout: true, [optionId]: true })
  );

  await close();
});
