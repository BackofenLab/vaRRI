import { viewerComponent } from './context.js';
import SiteHeader from './site-header.js';
import SiteFooter from './site-footer.js';
import SequenceInput from './sequence-input.js';
import VisualizationSettings from './visualization-settings.js';
import AnnotationPanel from './annotation-panel.js';
import ProfilePanel from './profile-panel.js';
import ViewerPanel from './viewer-panel.js';
import HelpPanel from './help-panel.js';
import NumberDialog from './number-dialog.js';
import TextDialog from './text-dialog.js';
import SubseqHighlightDialog from './subseq-highlight-dialog.js';
import RegionHighlightDialog from './region-highlight-dialog.js';
import MutationDialog from './mutation-dialog.js';
import FastaDialog from './fasta-dialog.js';
import PNGExportDialog from './png-export-dialog.js';

export default viewerComponent('VaRRIApp', `
  <SiteHeader />
  <main>
    <div class="controls-column">
      <SequenceInput /><VisualizationSettings />
      <AnnotationPanel kind="regions" /><AnnotationPanel kind="subsequences" /><AnnotationPanel kind="mutations" />
      <ProfilePanel /><HelpPanel />
    </div>
    <ViewerPanel />
  </main>
  <SiteFooter />
  <PNGExportDialog /><NumberDialog /><TextDialog /><SubseqHighlightDialog /><RegionHighlightDialog /><MutationDialog /><FastaDialog />
`, { SiteHeader, SiteFooter, SequenceInput, VisualizationSettings, AnnotationPanel,
  ProfilePanel, ViewerPanel, HelpPanel, NumberDialog, TextDialog, SubseqHighlightDialog,
  RegionHighlightDialog, MutationDialog, FastaDialog, PNGExportDialog });
