export default {
  name: 'VideoGuides',
  props: { clips: { type: Array, required: true } },
  template: `<details class="panel-video-guides">
    <summary>Video guides</summary>
    <div v-for="id in clips" :key="id" :data-help-demo="id"></div>
  </details>`,
};
