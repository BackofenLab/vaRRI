const plainText = value => typeof value === 'string' && value.trim() && !/[\r\n]/.test(value);
const escapeText = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const timestamp = seconds => new Date(Math.round(seconds * 1000)).toISOString().slice(11, 23);

export function validateCues(cues, duration) {
  if (!Number.isFinite(duration) || duration <= 0 || !Array.isArray(cues) || !cues.length ||
    cues[0].start !== 0 || cues.some((cue, index) => !plainText(cue.text) ||
      !Number.isFinite(cue.start) || cue.start < 0 || cue.start >= duration ||
      (index && cue.start <= cues[index - 1].start))) {
    throw new Error('Captions require ordered, nonempty, single-line cues spanning the clip duration.');
  }
}

export function serializeCaptions(cues, duration) {
  validateCues(cues, duration);
  const blocks = cues.map((cue, index) => `${index + 1}\n${timestamp(cue.start)} --> ` +
    `${timestamp(cues[index + 1]?.start ?? duration)}\n${escapeText(cue.text)}\n`);
  return 'WEBVTT\n\n' + blocks.join('\n');
}

export function verifyCaptions(content, transcript, duration) {
  const blocks = content.toString('utf8').trim().split(/\r?\n\r?\n/);
  if (blocks.shift() !== 'WEBVTT' || blocks.length !== transcript.length) {
    throw new Error('Caption track does not match the transcript.');
  }
  const seconds = value => {
    const match = /^(\d{2}):([0-5]\d):([0-5]\d)\.(\d{3})$/.exec(value);
    if (!match) throw new Error('Invalid caption timestamp.');
    return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000;
  };
  let previousEnd = 0;
  blocks.forEach((block, index) => {
    const [number, timing, text, ...extra] = block.split(/\r?\n/);
    const times = timing?.split(' --> ');
    if (number !== String(index + 1) || times?.length !== 2 || extra.length ||
      !plainText(text) || text !== escapeText(transcript[index])) {
      throw new Error('Caption track does not match the transcript.');
    }
    const start = seconds(times[0]);
    const end = seconds(times[1]);
    if (Math.abs(start - previousEnd) > 0.001 || end <= start || end > duration + 0.001) {
      throw new Error('Caption timing must cover the clip without gaps or overlaps.');
    }
    previousEnd = end;
  });
  if (Math.abs(previousEnd - duration) > 0.001) throw new Error('Captions do not cover the complete clip.');
}
