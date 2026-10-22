import { viewerComponent } from './context.js';

export default viewerComponent('text-annotation-panel', `<aside class="panel control-panel" aria-label="Text annotations">
  <details class="control-group" name="controls-accordion">
    <summary>Text Annotations <span id="textAnnotationCounterUI" class="list-counter">{{ state.annotations.texts.length ? '(' + state.annotations.texts.length + ')' : '' }}</span></summary>
    <div class="control-group-body">
      <p class="text-annotation-hint">Drag an unpositioned label onto the drawing. Drag labels in the drawing to move them.</p>
      <ul id="text-annotation-list" class="highlight-list">
        <li v-if="!state.annotations.texts.length" class="highlight-empty">No text annotations defined.</li>
        <li v-for="item in state.annotations.texts" :key="item.id" class="highlight-item text-annotation-item"
          :class="{active:state.fields.textAnnotationEditId === String(item.id), 'sequence-name-annotation':item.sequenceNameFor}"
          :data-text-annotation-id="item.id" :data-sequence-name-for="item.sequenceNameFor || null">
          <span class="text-annotation-status" role="img" :aria-label="actions.textAnnotationStatus(item)"
            :title="actions.textAnnotationStatus(item)">{{ actions.textAnnotationAvailable(item) && item.position ? '⌖' : '?' }}</span>
          <button type="button" class="highlight-item-main text-annotation-preview" :style="actions.textAnnotationStyle(item)"
            :draggable="!item.position && actions.textAnnotationAvailable(item)"
            :title="item.position || !actions.textAnnotationAvailable(item) ? 'Click to edit text annotation' : 'Drag onto the drawing, or click to edit'"
            @dragstart="actions.startTextAnnotationDrag(item,$event)" @dragend="actions.endTextAnnotationDrag()"
            @click="actions.editTextAnnotation(item,$event)"><span v-if="item.sequenceNameFor" class="text-annotation-kind">Sequence {{ item.sequenceNameFor }} name</span>{{ item.text }}</button>
          <button type="button" class="highlight-delete"
            :aria-label="item.sequenceNameFor ? 'Unposition sequence ' + item.sequenceNameFor + ' name' : 'Remove text annotation ' + item.id"
            :title="item.sequenceNameFor ? 'Remove sequence name from the drawing' : 'Remove text annotation'"
            @click="actions.removeTextAnnotation(item)">🗑️</button>
        </li>
      </ul>
      <div class="action-row">
        <button id="textAnnotationClearAllBtn" class="btn btn-secondary btn-sm" type="button"
          :disabled="!state.annotations.texts.length" title="Remove user labels and unposition sequence names"
          @click="actions.clearTextAnnotationList()">Clear annotations</button>
        <button id="textAnnotationSubmitBtn" class="btn btn-primary btn-sm" type="button" @click="actions.addTextAnnotation($event)">Add</button>
      </div>
    </div>
  </details>
</aside>`);
