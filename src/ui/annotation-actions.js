const TYPES = {
  subsequences: { prefix: 'subseq', method: 'Subseq', dialog: 'subseqHighlightDialog', title: 'Highlight Subsequence ...', remove: 'removeSubsequenceHighlight' },
  regions: { prefix: 'region', method: 'Region', dialog: 'regionHighlightDialog', title: 'Highlight RRI Region ...', remove: 'removeRegionHighlight' },
  mutations: { prefix: 'mutation', method: 'Mutation', dialog: 'mutationDialog', title: 'Define Point Mutation ...', remove: 'removePointMutation' },
};

export function createAnnotationActions({ api, state, actions, colors }) {
  function open(kind, event) {
    const type = TYPES[kind];
    actions.openDialog(type.dialog, type.title, '', event,
      () => actions[`submit${type.method}Form`](), () => actions[`reset${type.method}Form`]());
  }
  return {
    annotationLabel(kind, item) {
      return kind === 'regions' ? item.rangeText : `Seq ${item.sequence} : ${kind === 'mutations' ? item.labelText : item.rangeText}`;
    },
    addAnnotation(kind, event) {
      actions[`reset${TYPES[kind].method}Form`]();
      open(kind, event);
    },
    editAnnotation(kind, item, event) {
      const { prefix } = TYPES[kind];
      const f = state.fields;
      f[`${prefix}EditId`] = String(item.id);
      f[`${prefix}Color`] = colors.cssColorToHex(item.color);
      if (kind === 'regions') {
        f.region1 = item.sequence1Range.join('-');
        f.region2 = item.sequence2Range.join('-');
      } else {
        f[`${prefix}Sequence`] = item.sequence;
        if (kind === 'mutations') {
          f.mutationPosition = String(item.position);
          f.mutationBase = item.replacement;
        } else f.subseqRange = item.rangeText;
      }
      if (kind !== 'mutations') f[`${prefix}Alpha`] = Number(item.alpha).toFixed(1);
      actions.clearFieldErrors(Object.keys(f).filter(key => key.startsWith(prefix)));
      open(kind, event);
    },
    removeAnnotation(kind, item) {
      const type = TYPES[kind];
      if (!api[type.remove](item.id)) return;
      if (state.fields[`${type.prefix}EditId`] === String(item.id)) actions[`reset${type.method}Form`]();
      actions.syncAnnotations();
      actions.runVisualization();
    },
  };
}
