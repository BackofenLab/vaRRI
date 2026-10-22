import { computed, inject } from 'vue';
import { VIEWER_CONTEXT } from './context.js';

const CONFIG = {
  subsequences: { title: 'Subsequence Highlights', aria: 'Subsequence highlights', list: 'highlight-list',
    counter: 'subseqCounterUI', edit: 'subseqEditId', button: 'highlightSubmitBtn',
    itemClass: '', empty: 'No highlights defined.', itemName: 'highlight' },
  regions: { title: 'Region Highlights', aria: 'Region highlights', list: 'region-list',
    counter: 'regionCounterUI', edit: 'regionEditId', button: 'regionSubmitBtn',
    itemClass: 'region-item', empty: 'No region highlights defined.', itemName: 'region highlight' },
  mutations: { title: 'Point Mutations', aria: 'Point mutations', list: 'mutation-list',
    counter: 'mutationCounterUI', edit: 'mutationEditId', button: 'mutationSubmitBtn',
    itemClass: 'mutation-item', empty: 'No mutations defined.', itemName: 'mutation' },
};

export default {
  name: 'AnnotationPanel', props: { kind: { type: String, required: true } },
  setup(props) {
    const context = inject(VIEWER_CONTEXT);
    return { ...context, config: computed(() => CONFIG[props.kind]),
      items: computed(() => context.state.annotations[props.kind]) };
  },
  template: `<aside class="panel control-panel" :aria-label="config.aria">
    <details class="control-group" name="controls-accordion">
      <summary>{{ config.title }} <span :id="config.counter" class="list-counter">{{ items.length ? '(' + items.length + ')' : '' }}</span></summary>
      <div class="control-group-body">
        <div v-if="kind === 'regions'" class="label-dropdown-col-row">
          <label for="backgroundhighlighting">&thinsp;Highlight of RRI region:</label>
          <select id="backgroundhighlighting" :value="state.fields.backgroundhighlighting" @change="actions.commitField('backgroundhighlighting', $event)">
            <option value="basepairs">basepairs</option><option value="region">region</option><option value="nothing">nothing</option>
          </select>
          <input type="color" id="colorRriRegion" class="legend-color-rect js-render-color" title="Select background highlight colour"
            :value="state.fields.colorRriRegion" @input="actions.inputField('colorRriRegion', $event)" @change="actions.commitField('colorRriRegion', $event)">
        </div>
        <ul :id="config.list" class="highlight-list">
          <li v-if="!items.length" class="highlight-empty">{{ config.empty }}</li>
          <li v-for="item in items" :key="item.id" class="highlight-item" :class="[config.itemClass, {generated:item.generated, active:state.fields[config.edit] === String(item.id)}]"
            :data-highlight-id="kind === 'subsequences' ? item.id : null" :data-region-id="kind === 'regions' ? item.id : null" :data-mutation-id="kind === 'mutations' ? item.id : null">
            <button type="button" class="highlight-item-main" :disabled="!!item.generated"
              :title="item.generated ? 'Generated region highlight' : 'Click to edit ' + config.itemName"
              :style="{borderLeft:'10px solid ' + (kind === 'mutations' ? item.color : colors.cssColorToRGB(item.color,item.alpha))}"
              @click="actions.editAnnotation(kind,item,$event)">{{ actions.annotationLabel(kind,item) }}</button>
            <button v-if="!item.generated" type="button" class="highlight-delete" :aria-label="'Remove ' + config.itemName + ' ' + item.id"
              :title="'Remove ' + config.itemName" @click="actions.removeAnnotation(kind,item)">🗑️</button>
          </li>
        </ul>
        <input type="hidden" :id="config.edit" :value="state.fields[config.edit]">
        <div class="action-row"><button :id="config.button" class="btn btn-primary btn-sm" type="button" @click="actions.addAnnotation(kind,$event)">Add</button></div>
      </div>
    </details>
  </aside>`,
};
