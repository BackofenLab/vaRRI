export default {
  name: 'VideoHelp',
  props: { clip: { type: String, required: true }, label: { type: String, required: true } },
  template: `<button type="button" class="video-help-icon" :data-help-video="clip"
    :aria-label="'Video guide: ' + label" aria-expanded="false" @click.stop @keydown.stop>
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false">
      <circle cx="6" cy="6" r="5.25" fill="none" stroke="currentColor" />
      <path d="M4.5 3.5 L8.5 6 L4.5 8.5 Z" fill="none" stroke="currentColor" stroke-linejoin="round" />
    </svg>
  </button>`,
};
