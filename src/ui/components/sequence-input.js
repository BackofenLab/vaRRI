import { viewerComponent } from './context.js';

export default viewerComponent('sequence-input', `<aside class="panel control-panel" aria-label="Sequence and structure input">
      <details class="control-group" name="controls-accordion" open="">
        <summary>Sequence &amp; Structure Input</summary>
        <div class="control-group-body">
        <span id="exampleDropdownLabel" class="example-label">Example</span>
        <div class="examples">
          <details id="exampleDropdown" class="example-dropdown" v-bind:open="state.exampleOpen" v-on:toggle="state.exampleOpen = $event.target.open" v-on:keydown.esc.prevent="actions.closeExamples()">
            <summary id="exampleDropdownTrigger" aria-labelledby="exampleDropdownLabel selectedExampleName">
              <span id="selectedExampleName">{{ actions.selectedExampleName() }}</span>
            </summary>
            <div id="exampleDropdownOptions" class="example-options" role="group" aria-label="Available examples"><button v-for="(example, key) in examples" v-bind:key="key" type="button" class="example-option" v-bind:data-example="key" v-bind:aria-current="state.selectedExample === key ? 'true' : null" v-on:click="actions.loadExample(key)"><span class="example-option-name">{{ example.nameShort || example.name || key }}</span><span class="example-option-description">{{ example.descriptionShort || example.description }}</span></button></div>
          </details>
          <button id="clearAllBtn" class="btn btn-secondary btn-sm" type="button" v-on:click="actions.clearAll($event)">✕ Clear</button>
        </div>
        <label for="sequence">
          Sequences <small>(IUPAC; separate molecules with &amp;)</small>
          &nbsp;
          <button id="fastaInputBtn" class="btn btn-secondary btn-sm" type="button" title="Provide sequences in FASTA format" v-on:click="actions.openFastaDialog($event)">FASTA</button>
        </label>
        <div class="input-wrap" v-bind:class="{'has-error': state.errors.sequence}">
          <div id="backdrop-sequence" class="backdropable"><div class="highlights" id="highlights-sequence"><span v-for="(part, index) in actions.highlightSegments('sequence')" v-bind:key="index" v-bind:class="part.className" v-bind:style="part.style">{{ part.text }}</span></div></div>
          <textarea id="sequence" class="backdropable" rows="3" placeholder="ACGAUCAGAGAUUAGAGCAUACGACAGCAG&amp;ACGAAAAGAGCAUACGACAGUAG" v-bind:value="state.fields.sequence" v-on:input="actions.inputField('sequence', $event)" v-on:change="actions.commitField('sequence', $event)" v-on:scroll="actions.syncScroll('sequence')"
            v-on:focus="actions.updateInputCaret('sequence', $event)"
            v-on:click="actions.updateInputCaret('sequence', $event)"
            v-on:keyup="actions.updateInputCaret('sequence', $event)"
            v-on:select="actions.updateInputCaret('sequence', $event)"
            v-on:selectionchange="actions.updateInputCaret('sequence', $event)"
            v-on:blur="actions.clearInputCaret()" v-on:dragover.prevent="actions.dragOver($event)" v-on:dragleave="actions.dragLeave($event)" v-on:drop.prevent="actions.dropFile('sequence', $event)"></textarea>
          <span class="field-tooltip">{{ state.errors.sequence || '' }}</span>
        </div>
        <div class="sequence-name-grid">
          <div><label for="seq1name">Name 1</label>
            <div class="input-wrap" :class="{'has-error':state.errors.seq1name}">
              <input id="seq1name" class="sequence-name-field" type="text" :value="state.fields.seq1name"
                :style="{backgroundColor:colors.cssColorToRGB(state.fields.colorSeq1,0.35)}"
                @input="actions.inputField('seq1name',$event)" @change="actions.commitField('seq1name',$event)"
                @keydown.enter.prevent="actions.commitField('seq1name',$event)">
              <span class="field-tooltip">{{ state.errors.seq1name || '' }}</span>
            </div>
          </div>
          <div><label for="seq2name">Name 2</label>
            <div class="input-wrap" :class="{'has-error':state.errors.seq2name}">
              <input id="seq2name" class="sequence-name-field" type="text" :value="state.fields.seq2name"
                :style="{backgroundColor:colors.cssColorToRGB(state.fields.colorSeq2,0.35)}"
                @input="actions.inputField('seq2name',$event)" @change="actions.commitField('seq2name',$event)"
                @keydown.enter.prevent="actions.commitField('seq2name',$event)">
              <span class="field-tooltip">{{ state.errors.seq2name || '' }}</span>
            </div>
          </div>
        </div>
        <div class="start-index-grid">
          <div class="start-index-item">
            <div class="start-index-label-row" v-bind:class="{'has-error': state.errors.startIndex1}">
              <input type="color" id="colorSeq1" class="legend-color js-render-color" title="Select sequence 1 strand colour" v-bind:value="state.fields.colorSeq1" v-on:input="actions.inputField('colorSeq1', $event)" v-on:change="actions.commitField('colorSeq1', $event)">
              <label for="startIndex1">Start&nbsp;1</label>
              <input type="number" id="startIndex1" v-bind:value="state.fields.startIndex1" v-on:input="actions.inputField('startIndex1', $event)" v-on:change="actions.commitField('startIndex1', $event)" v-on:keydown.enter.prevent="actions.commitField('startIndex1', $event)">
              <span class="field-tooltip">{{ state.errors.startIndex1 || '' }}</span>
            </div>
          </div>
          <div class="start-index-item">
            <div class="start-index-label-row" v-bind:class="{'has-error': state.errors.startIndex2}">
              <input type="color" id="colorSeq2" class="legend-color js-render-color" title="Select sequence 2 strand colour" v-bind:value="state.fields.colorSeq2" v-on:input="actions.inputField('colorSeq2', $event)" v-on:change="actions.commitField('colorSeq2', $event)">
              <label for="startIndex2">Start&nbsp;2</label>
              <input type="number" id="startIndex2" v-bind:value="state.fields.startIndex2" v-on:input="actions.inputField('startIndex2', $event)" v-on:change="actions.commitField('startIndex2', $event)" v-on:keydown.enter.prevent="actions.commitField('startIndex2', $event)">
              <span class="field-tooltip">{{ state.errors.startIndex2 || '' }}</span>
            </div>
          </div>
        </div>
        <label for="structure">
          Structure <small>(dot-bracket; separate molecules with &amp;)</small>
        </label>
        <div class="input-wrap" v-bind:class="{'has-error': state.errors.structure}">
          <div id="backdrop-structure" class="backdropable"><div class="highlights" id="highlights-structure"><span v-for="(part, index) in actions.highlightSegments('structure')" v-bind:key="index" v-bind:class="part.className" v-bind:style="part.style">{{ part.text }}</span></div></div>
          <textarea id="structure" class="backdropable" rows="3" placeholder="..(((((....)))))(((....)))..&amp;..(((......))).." v-bind:value="state.fields.structure" v-on:input="actions.inputField('structure', $event)" v-on:change="actions.commitField('structure', $event)" v-on:scroll="actions.syncScroll('structure')"
            v-on:focus="actions.updateInputCaret('structure', $event)"
            v-on:click="actions.updateInputCaret('structure', $event)"
            v-on:keyup="actions.updateInputCaret('structure', $event)"
            v-on:select="actions.updateInputCaret('structure', $event)"
            v-on:selectionchange="actions.updateInputCaret('structure', $event)"
            v-on:blur="actions.clearInputCaret()"></textarea>
          <span class="field-tooltip">{{ state.errors.structure || '' }}</span>
        </div>
        </div>
      </details>
      <div id="msg" v-bind:class="state.message.text ? state.message.type : ''" v-show="state.message.text">{{ state.message.text }}</div>
    </aside>`);
