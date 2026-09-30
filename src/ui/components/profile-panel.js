import { viewerComponent } from './context.js';

export default viewerComponent('profile-panel', `<aside class="panel control-panel" aria-label="Probability profiles">
      <details class="control-group" name="controls-accordion">
        <summary>
          Probability Profiles <small>(Accessibility, ...)</small>
          <span id="profileCounterUI" class="list-counter">{{ actions.profileCount() ? '(' + actions.profileCount() + ')' : '' }}</span>
        </summary>
        <div class="control-group-body">
          <label><small>Space-separated CSV; # starts comment line</small></label>
          <div class="row-2">
            <div class="profile-label-with-color">
              <label for="profileData1">Seq. 1 profile</label>
              <input type="color" id="profileColor1" class="profile-color-picker" title="Accessibility color for sequence 1" aria-label="Accessibility color for sequence 1" v-bind:value="state.fields.profileColor1" v-on:input="actions.inputField('profileColor1', $event)" v-on:change="actions.commitField('profileColor1', $event)">
              <span class="profile-color-mode-wrap">
                <label for="profileColorRepresentsOne1" class="profile-color-mode-text">=1</label>
                <input type="checkbox" id="profileColorRepresentsOne1" class="profile-color-mode-checkbox" aria-label="Map the sequence 1 profile color to value one" v-bind:checked="state.fields.profileColorRepresentsOne1" v-on:input="actions.inputField('profileColorRepresentsOne1', $event)" v-on:change="actions.commitField('profileColorRepresentsOne1', $event)">
              </span>
            </div>
            <div class="profile-label-with-color">
              <label for="profileData2">Seq. 2 profile</label>
              <input type="color" id="profileColor2" class="profile-color-picker" title="Accessibility color for sequence 2" aria-label="Accessibility color for sequence 2" v-bind:value="state.fields.profileColor2" v-on:input="actions.inputField('profileColor2', $event)" v-on:change="actions.commitField('profileColor2', $event)">
              <span class="profile-color-mode-wrap">
                <label for="profileColorRepresentsOne2" class="profile-color-mode-text">=1</label>
                <input type="checkbox" id="profileColorRepresentsOne2" class="profile-color-mode-checkbox" aria-label="Map the sequence 2 profile color to value one" v-bind:checked="state.fields.profileColorRepresentsOne2" v-on:input="actions.inputField('profileColorRepresentsOne2', $event)" v-on:change="actions.commitField('profileColorRepresentsOne2', $event)">
              </span>
            </div>
          </div>
          <div class="row-2">
            <div class="input-wrap" v-bind:class="{'has-error': state.errors.profileData1}">
              <textarea id="profileData1" name="profileData1" class="profileData" rows="10" cols="10" v-bind:value="state.fields.profileData1" v-on:input="actions.inputField('profileData1', $event)" v-on:change="actions.commitField('profileData1', $event)" v-on:dragover.prevent="actions.dragOver($event)" v-on:dragleave="actions.dragLeave($event)" v-on:drop.prevent="actions.dropFile('profileData1', $event)"></textarea>
              <span class="field-tooltip">{{ state.errors.profileData1 || '' }}</span>
            </div>
            <div class="input-wrap" v-bind:class="{'has-error': state.errors.profileData2}">
              <textarea id="profileData2" name="profileData2" class="profileData" rows="10" cols="10" v-bind:value="state.fields.profileData2" v-on:input="actions.inputField('profileData2', $event)" v-on:change="actions.commitField('profileData2', $event)" v-on:dragover.prevent="actions.dragOver($event)" v-on:dragleave="actions.dragLeave($event)" v-on:drop.prevent="actions.dropFile('profileData2', $event)"></textarea>
              <span class="field-tooltip">{{ state.errors.profileData2 || '' }}</span>
            </div>
          </div>
          <div class="row-2">
            <div class="checkbox-row">
              <label for="profileIdxRef1">Index&nbsp;wrt.</label>
              <select id="profileIdxRef1" v-bind:value="state.fields.profileIdxRef1" v-on:input="actions.inputField('profileIdxRef1', $event)" v-on:change="actions.commitField('profileIdxRef1', $event)">
                <option value="1">1st nt</option>
                <option value="start">Start 1</option>
              </select>
            </div>
            <div class="checkbox-row">
              <label for="profileIdxRef2">Index&nbsp;wrt.</label>
              <select id="profileIdxRef2" v-bind:value="state.fields.profileIdxRef2" v-on:input="actions.inputField('profileIdxRef2', $event)" v-on:change="actions.commitField('profileIdxRef2', $event)">
                <option value="1">1st nt</option>
                <option value="start">Start 1</option>
              </select>
            </div>
          </div>
          <div class="action-row">
            <button id="profileApplyBtn" class="btn btn-primary btn-sm" type="button" v-on:click="actions.runVisualization($event)">Apply</button>
            <button id="profileClearBtn" class="btn btn-secondary btn-sm" type="button" v-on:click="actions.resetProfileForm($event)">Clear</button>
          </div>
        </div>
      </details>
    </aside>`);
