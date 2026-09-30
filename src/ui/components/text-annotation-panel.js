import { viewerComponent } from './context.js';

export default viewerComponent('text-annotation-panel', `<aside class="panel control-panel" aria-label="Text annotations">
  <details class="control-group" name="controls-accordion">
    <summary>Text Annotations <span id="textAnnotationCounterUI" class="list-counter">{{ state.annotations.texts.length ? '(' + state.annotations.texts.length + ')' : '' }}</span></summary>
    <div class="control-group-body">
      <p class="text-annotation-hint">Drag an unpositioned label onto the drawing. Drag labels in the drawing to move them.</p>
      <ul id="text-annotation-list" class="highlight-list">
        <li v-if="!state.annotations.texts.length" class="highlight-empty">No text annotations defined.</li>
        <li v-for="item in state.annotations.texts" :key="item.id" class="highlight-item text-annotation-item"
          :class="{active:state.fields.textAnnotationEditId === String(item.id)}" :data-text-annotation-id="item.id">
          <span class="text-annotation-status" role="img" :aria-label="item.position ? 'Positioned' : 'Unpositioned'"
            :title="item.position ? 'Positioned in the drawing' : 'Drag this label onto the drawing'">{{ item.position ? '⌖' : '?' }}</span>
          <button type="button" class="highlight-item-main text-annotation-preview" :style="actions.textAnnotationStyle(item)"
            :draggable="!item.position" :title="item.position ? 'Click to edit text annotation' : 'Drag onto the drawing, or click to edit'"
            @dragstart="actions.startTextAnnotationDrag(item,$event)" @dragend="actions.endTextAnnotationDrag()"
            @click="actions.editTextAnnotation(item)">{{ item.text }}</button>
          <button type="button" class="highlight-delete" :aria-label="'Remove text annotation ' + item.id"
            title="Remove text annotation" @click="actions.removeTextAnnotation(item)">🗑️</button>
        </li>
      </ul>
      <form class="text-annotation-form" @submit.prevent="actions.submitTextAnnotationForm()">
        <label for="textAnnotationText">Text</label>
        <div class="input-wrap" :class="{'has-error':state.errors.textAnnotationText}">
          <input id="textAnnotationText" type="text" autocomplete="off" placeholder="e.g. Binding site"
            :value="state.fields.textAnnotationText" @input="actions.inputField('textAnnotationText',$event)"
            @change="actions.commitField('textAnnotationText',$event)" :aria-invalid="!!state.errors.textAnnotationText"
            aria-describedby="textAnnotationTextError">
          <span id="textAnnotationTextError" class="field-tooltip">{{ state.errors.textAnnotationText || '' }}</span>
        </div>
        <div class="text-annotation-format">
          <label class="text-annotation-toggle"><input id="textAnnotationBold" type="checkbox" :checked="state.fields.textAnnotationBold"
            @change="actions.commitField('textAnnotationBold',$event)"><strong>Bold</strong></label>
          <label class="text-annotation-toggle"><input id="textAnnotationItalic" type="checkbox" :checked="state.fields.textAnnotationItalic"
            @change="actions.commitField('textAnnotationItalic',$event)"><em>Italic</em></label>
          <div><label for="textAnnotationSize">Size</label>
            <div class="input-wrap" :class="{'has-error':state.errors.textAnnotationSize}">
              <input id="textAnnotationSize" type="number" min="1" step="any" :value="state.fields.textAnnotationSize"
                @input="actions.inputField('textAnnotationSize',$event)" @change="actions.commitField('textAnnotationSize',$event)"
                :aria-invalid="!!state.errors.textAnnotationSize" aria-describedby="textAnnotationSizeError">
              <span id="textAnnotationSizeError" class="field-tooltip">{{ state.errors.textAnnotationSize || '' }}</span>
            </div>
          </div>
          <div><label for="textAnnotationColor">Color</label>
            <input id="textAnnotationColor" type="color" :value="state.fields.textAnnotationColor"
              @input="actions.inputField('textAnnotationColor',$event)" @change="actions.commitField('textAnnotationColor',$event)">
          </div>
        </div>
        <div class="action-row">
          <button id="textAnnotationClearAllBtn" class="btn btn-secondary btn-sm" type="button"
            :disabled="!state.annotations.texts.length" @click="actions.clearTextAnnotationList()">Remove all</button>
          <button id="textAnnotationClearBtn" class="btn btn-secondary btn-sm" type="button"
            @click="actions.resetTextAnnotationForm()">Clear inputs</button>
          <button id="textAnnotationSubmitBtn" class="btn btn-primary btn-sm" type="submit">{{ state.fields.textAnnotationEditId ? 'Update' : 'Add' }}</button>
        </div>
      </form>
    </div>
  </details>
</aside>`);
