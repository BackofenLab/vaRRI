export default {
  name: 'VideoHelp',
  props: { clip: { type: String, required: true }, label: { type: String, required: true } },
  template: `<button type="button" class="video-help-icon" :data-help-video="clip"
    :aria-label="'Video guide: ' + label" aria-expanded="false" @click.stop @keydown.stop>
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false">
      <path d="M3 1.5 L10 6 L3 10.5 Z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" />
    </svg>
  </button>`,
};
