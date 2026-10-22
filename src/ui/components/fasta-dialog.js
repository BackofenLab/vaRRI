import { viewerComponent } from './context.js';

export default viewerComponent('fasta-dialog', `<dialog id="fastaDialog" class="app-dialog" aria-labelledby="fastaDialogTitle" v-on:close="actions.closeDialog('fastaDialog')" v-bind:style="state.dialog.id === 'fastaDialog' ? {left:state.dialog.left, top:state.dialog.top} : {}">
  <form method="dialog" v-on:submit="actions.submitDialog('fastaDialog', $event)">
    <div id="fastaDialogTitle" class="dialog-header" v-on:pointerdown="actions.dragDialog($event)">FASTA Data ... <small>(Structure input is optional)</small></div>
    <div class="dialog-body">  
        <div class="input-wrap" v-bind:class="{'has-error': state.errors.fastaInput}">
          <textarea id="fastaInput" rows="10" placeholder=">seq1
ACGAUCAUGGAUUAGAGCAUUCGACAGCAG
..<<<<...>>>>...((..(((...((..
>seq2
ACGAAAAAAAGAGCAUACGACAGccc
............))...)))..)).." v-bind:value="state.fields.fastaInput" v-on:input="actions.inputField('fastaInput', $event)" v-on:change="actions.commitField('fastaInput', $event)" v-on:dragover.prevent="actions.dragOver($event)" v-on:dragleave="actions.dragLeave($event)" v-on:drop.prevent="actions.dropFile('fastaInput', $event)"></textarea>
          <span class="field-tooltip">{{ state.errors.fastaInput || '' }}</span>
        </div>
        <div class="sequence-name-grid" v-if="state.fields.fastaSequence">
          <div v-for="number in (state.fields.fastaSequence.includes('&') ? ['1','2'] : ['1'])" :key="number">
            <label :for="'fastaSeqName' + number">Sequence {{ number }} name</label>
            <div class="input-wrap" :class="{'has-error':state.errors['fastaSeqName' + number]}">
              <input :id="'fastaSeqName' + number" class="sequence-name-field" type="text"
                :value="state.fields['fastaSeqName' + number]"
                :style="{backgroundColor:colors.cssColorToRGB(state.fields['colorSeq' + number],0.35)}"
                @input="actions.inputField('fastaSeqName' + number,$event)"
                @change="actions.commitField('fastaSeqName' + number,$event)">
              <span class="field-tooltip">{{ state.errors['fastaSeqName' + number] || '' }}</span>
            </div>
          </div>
        </div>
        <label>Parsed Sequences:</label>
        <div class="input-wrap" v-bind:class="{'has-error': state.errors.fastaSequence}">
          <div id="backdrop-fastaSequence" class="backdropable"><div class="highlights" id="highlights-fastaSequence"><span v-for="(part, index) in actions.highlightSegments('fastaSequence')" v-bind:key="index" v-bind:class="part.className" v-bind:style="part.style">{{ part.text }}</span></div></div>
          <textarea id="fastaSequence" class="backdropable" rows="3" disabled="" v-bind:value="state.fields.fastaSequence" v-on:input="actions.inputField('fastaSequence', $event)" v-on:change="actions.commitField('fastaSequence', $event)" v-on:scroll="actions.syncScroll('fastaSequence')"></textarea>
          <span class="field-tooltip">{{ state.errors.fastaSequence || '' }}</span>
        </div>
        <label>Parsed Structures:</label>
        <div class="input-wrap" v-bind:class="{'has-error': state.errors.fastaStructure}">
          <div id="backdrop-fastaStructure" class="backdropable"><div class="highlights" id="highlights-fastaStructure"><span v-for="(part, index) in actions.highlightSegments('fastaStructure')" v-bind:key="index" v-bind:class="part.className" v-bind:style="part.style">{{ part.text }}</span></div></div>
          <textarea id="fastaStructure" class="backdropable" rows="3" disabled="" v-bind:value="state.fields.fastaStructure" v-on:input="actions.inputField('fastaStructure', $event)" v-on:change="actions.commitField('fastaStructure', $event)" v-on:scroll="actions.syncScroll('fastaStructure')"></textarea>
          <span class="field-tooltip">{{ state.errors.fastaStructure || '' }}</span>
        </div>
    </div>
    <div class="dialog-actions">
      <button value="ok" class="btn btn-primary">OK</button>
      <button value="cancel" class="btn btn-secondary">Cancel</button>
    </div>
  </form>
</dialog>`);
