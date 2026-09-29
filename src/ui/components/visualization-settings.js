import { viewerComponent } from './context.js';

export default viewerComponent('visualization-settings', `<aside class="panel control-panel" aria-label="Visualization settings">
      <details class="control-group" name="controls-accordion">
        <summary>Visualization Settings
          <span id="full-screen-menu">
            <input type="checkbox" id="hideFooterAndHeader" v-bind:checked="state.fields.hideFooterAndHeader" v-on:input="actions.inputField('hideFooterAndHeader', $event)" v-on:change="actions.commitField('hideFooterAndHeader', $event)">
            <label for="hideFooterAndHeader" title="Toogle to Full Screen mode.">Full Screen</label>
          </span>
        </summary>
        <div class="control-group-body">
          <div class="row-2">
            <label for="colorBasepair" title="Select base pair colour">Base pair color</label>
            <input type="color" id="colorBasepair" class="legend-color-rect js-render-color" title="Select base pair colour" v-bind:value="state.fields.colorBasepair" v-on:input="actions.inputField('colorBasepair', $event)" v-on:change="actions.commitField('colorBasepair', $event)">
          </div>
          <div class="row-2">
              <label for="coloring">Nucleotide color</label>
            <select id="coloring" v-bind:value="state.fields.coloring" v-on:input="actions.inputField('coloring', $event)" v-on:change="actions.commitField('coloring', $event)">
              <option value="strand">by sequence</option>
              <option value="loop">by loop type</option>
            </select>
          </div>
          <label for="highlighting">Highlighting</label>
          <div class="label-dropdown-col-row">
            <label for="highlighting">of RRI nucleotides</label>
            <select id="highlighting" v-bind:value="state.fields.highlighting" v-on:input="actions.inputField('highlighting', $event)" v-on:change="actions.commitField('highlighting', $event)">
              <option value="region">region</option>
              <option value="basepairs">basepairs</option>
              <option value="nothing">nothing</option>
            </select>
            <input type="color" id="colorRriNodes" class="legend-color js-render-color" title="Select nucleotide highlight colour" v-bind:value="state.fields.colorRriNodes" v-on:input="actions.inputField('colorRriNodes', $event)" v-on:change="actions.commitField('colorRriNodes', $event)">
          </div>
          <div class="checkbox-row">
            <input type="checkbox" id="distinctBpTypes" v-bind:checked="state.fields.distinctBpTypes" v-on:input="actions.inputField('distinctBpTypes', $event)" v-on:change="actions.commitField('distinctBpTypes', $event)">
            <label for="distinctBpTypes">Basepair styling <small>(AU,GC=line, GU=dashed, *=dotted)</small></label>
          </div>
          <div class="checkbox-row">
            <input type="checkbox" id="forceLayout" v-bind:checked="state.fields.forceLayout" v-on:input="actions.inputField('forceLayout', $event)" v-on:change="actions.commitField('forceLayout', $event)">
            <label for="forceLayout">Force layout</label>
          </div>
          <div class="checkbox-row checkbox-row-nested">
            <input type="checkbox" id="forceLayoutLinearRRI" v-bind:checked="state.fields.forceLayoutLinearRRI" v-on:input="actions.inputField('forceLayoutLinearRRI', $event)" v-on:change="actions.commitField('forceLayoutLinearRRI', $event)">
            <label for="forceLayoutLinearRRI">Linear horizontal RRI layout</label>
          </div>
          <div class="checkbox-row checkbox-row-nested">
            <input type="checkbox" id="forceLayoutFreeTails" v-bind:checked="state.fields.forceLayoutFreeTails" v-on:input="actions.inputField('forceLayoutFreeTails', $event)" v-on:change="actions.commitField('forceLayoutFreeTails', $event)" v-bind:disabled="!state.fields.forceLayout">
            <label for="forceLayoutFreeTails">Free trailing ends</label>
          </div>
          <div class="checkbox-row checkbox-row-nested">
            <input type="checkbox" id="forceLayoutPullCrossing" v-bind:checked="state.fields.forceLayoutPullCrossing" v-on:input="actions.inputField('forceLayoutPullCrossing', $event)" v-on:change="actions.commitField('forceLayoutPullCrossing', $event)" v-bind:disabled="!state.fields.forceLayout">
            <label for="forceLayoutPullCrossing">Pull pseudoknot basepairs</label>
          </div>
          <div class="checkbox-row checkbox-row-nested">
            <input type="checkbox" id="forceLayoutLinearStructure" v-bind:checked="state.fields.forceLayoutLinearStructure" v-on:input="actions.inputField('forceLayoutLinearStructure', $event)" v-on:change="actions.commitField('forceLayoutLinearStructure', $event)">
            <label for="forceLayoutLinearStructure">Linear intramolecular stem layout</label>
          </div>
        </div>
      </details>
    </aside>`);
