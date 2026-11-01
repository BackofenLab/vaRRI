/** Reject cards that hide the most recent completed gesture too soon. */
export function verifyActionPauses(timeline) {
  let lastAction;
  for (const entry of timeline) {
    if (entry.type === 'action-end') lastAction = entry;
    if (entry.type === 'instruction' && lastAction && entry.start - lastAction.start < 0.5 - 1e-9) {
      throw new Error(`Instruction follows ${lastAction.action} before the 0.5-second action pause.`);
    }
  }
}
