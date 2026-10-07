import { viewerComponent } from './context.js';

export default viewerComponent('canvas-help-dialog', `<dialog id="canvasHelpDialog" class="app-dialog canvas-help-dialog"
  aria-labelledby="canvasHelpTitle" v-on:close="actions.closeDialog('canvasHelpDialog')">
  <form method="dialog" v-on:submit="actions.submitDialog('canvasHelpDialog', $event)">
    <div class="dialog-header" id="canvasHelpTitle" tabindex="-1" autofocus>Canvas interactions</div>
    <div class="dialog-body">
      <p>Use <strong>Ctrl</strong> on Linux and Windows, or <strong>Command (⌘)</strong> on macOS, for the shortcuts below.</p>
      <dl>
        <dt>Select</dt><dd>Ctrl/Command-click a nucleotide, numbering label, or text label to toggle selection.
          Ctrl/Command-drag the background to select all elements fully inside the rectangle.
          A plain click on an element, Ctrl/Command-click on the background, or an empty selection rectangle clears selection.</dd>
        <dt>Move</dt><dd>Drag an element to move it. Drag a selected element to move the whole selection.
          Dragging an unselected element clears the selection. Moved nucleotides and numbering labels stay fixed, even with Force layout enabled.</dd>
        <dt>Rotate</dt><dd>Select at least two elements, then Ctrl/Command-scroll to rotate them around the mouse pointer.
          Text stays upright. Ordinary scrolling zooms, and dragging the background pans.</dd>
        <dt>Moved</dt><dd>The count includes manually positioned nucleotides and numbering labels. Click it to select them all.</dd>
        <dt>Release</dt><dd>Unfix selected nodes at their current positions. They resume moving when Force layout is enabled.
          Released nodes leave the Moved count. Text labels are unaffected.</dd>
        <dt>Reset</dt><dd>Restore selected manually positioned nodes to their positions and fixation before their first edit.
          Text labels are unaffected. To reset a released node, undo its release first.</dd>
        <dt>Undo</dt><dd>Reverse the last drag, rotation, release, or reset, including text movements.
          Ctrl/Command+Z also works while the canvas is focused. Up to 100 edits are kept for the current rendering.</dd>
      </dl>
      <p>Rerendering clears temporary node positions and undo history. SVG and PNG exports preserve the layout without selection outlines.
        Share links preserve text-label positions only.</p>
    </div>
    <div class="dialog-actions"><button value="ok" class="btn btn-primary">Close</button></div>
  </form>
</dialog>`);
