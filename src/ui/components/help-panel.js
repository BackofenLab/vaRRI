import { viewerComponent } from './context.js';

export default viewerComponent('help-panel', `<aside class="panel control-panel" aria-label="Help and documentation">
      <details class="control-group" name="controls-accordion">
        <summary>
          <a href="README.html" target="_blank" rel="noopener noreferrer">
            Help and Documentation
          </a>
        </summary>
      </details>
    </aside>`);
