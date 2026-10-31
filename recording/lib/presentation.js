// Recording overlays are separate from the viewer, including above modal dialogs.
export async function installPresentation(page, title) {
  await page.evaluate(title => {
    const layer = document.createElement('div');
    layer.dataset.demoLayer = '';
    layer.setAttribute('popover', 'manual');
    layer.innerHTML = `<section data-demo-heading hidden>
      <div data-demo-kicker></div><div data-demo-caption></div>
      </section><div data-demo-focus hidden></div><div data-demo-ring hidden></div>
      <div data-demo-action hidden></div><div data-demo-pointer>
      <svg viewBox="0 0 28 34"><path d="M3 2 L3 26 L9 20 L15 31 L20 28 L14 18 L24 18 Z"
      fill="#173e55" stroke="white" stroke-width="2"/></svg></div>`;
    layer.dataset.title = title;
    layer.querySelector('[data-demo-pointer]').style.transform = 'translate(35px, 110px)';
    document.body.append(layer);
    layer.showPopover();
  }, title);
}

export async function raisePresentation(page) {
  await page.locator('[data-demo-layer]').evaluate(layer => {
    // A newly opened dialog otherwise sits above an existing popover.
    if (layer.matches(':popover-open')) layer.hidePopover();
    layer.showPopover();
  });
}

export async function showInstruction(page, text, step) {
  await page.locator('[data-demo-layer]').evaluate((layer, { text, step }) => {
    layer.querySelector('[data-demo-kicker]').textContent = step
      ? `VIDEO GUIDE · STEP ${step}` : `VIDEO GUIDE · ${layer.dataset.title}`;
    layer.querySelector('[data-demo-caption]').textContent = text;
    layer.querySelector('[data-demo-heading]').hidden = false;
    layer.querySelector('[data-demo-pointer]').hidden = true;
  }, { text, step });
}

export async function hideInstruction(page) {
  await page.locator('[data-demo-layer]').evaluate(layer => {
    layer.querySelector('[data-demo-heading]').hidden = true;
    layer.querySelector('[data-demo-pointer]').hidden = false;
  });
}

export async function showAction(page, point, text, box = null, progress = 0) {
  await page.locator('[data-demo-layer]').evaluate((layer, state) => {
    const { point, text, box, progress } = state;
    const ring = layer.querySelector('[data-demo-ring]');
    ring.hidden = false;
    const diameter = 30 + progress * 44;
    Object.assign(ring.style, { left: `${point.x - diameter / 2}px`,
      top: `${point.y - diameter / 2}px`, width: `${diameter}px`, height: `${diameter}px`,
      opacity: String(1 - progress * 0.6) });
    const label = layer.querySelector('[data-demo-action]');
    label.hidden = false;
    label.textContent = text;
    label.style.left = `${Math.max(12, Math.min(point.x + 24, innerWidth - 250))}px`;
    label.style.top = `${point.y > innerHeight - 85 ? point.y - 54 : point.y + 32}px`;
    const focus = layer.querySelector('[data-demo-focus]');
    focus.hidden = !box;
    if (box) Object.assign(focus.style, { left: `${box.x - 5}px`, top: `${box.y - 5}px`,
      width: `${box.width + 10}px`, height: `${box.height + 10}px` });
  }, { point, text, box, progress });
}

export async function hideAction(page) {
  await page.locator('[data-demo-layer]').evaluate(layer => {
    for (const selector of ['[data-demo-ring]', '[data-demo-action]', '[data-demo-focus]']) {
      layer.querySelector(selector).hidden = true;
    }
  });
}

export const readingSeconds = text => Math.max(2.4, 0.45 + text.trim().split(/\s+/).length / 3.2);
