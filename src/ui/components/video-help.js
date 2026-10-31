export default {
  name: 'VideoHelp',
  props: { clip: { type: String, required: true }, label: { type: String, required: true } },
  template: `<button type="button" class="video-help-icon" :data-help-video="clip"
    :aria-label="'Video guide: ' + label" aria-expanded="false" @click.stop @keydown.stop>
    <svg viewBox="0 0 24 18" width="20" height="16" aria-hidden="true" focusable="false">
      <rect x="1" y="1" width="22" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="1.5" />
      <path d="M10 5 L16 9 L10 13 Z" fill="currentColor" />
    </svg>
  </button>`,
};
