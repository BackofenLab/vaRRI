import { parseFasta } from '../services/fasta-parser.js';

/** FASTA form actions operate on the same fields that Vue renders. */
export function createFastaController({ api, state, actions }) {
  const fields = state.fields;
  const formFields = ['fastaInput', 'fastaSequence', 'fastaStructure', 'fastaSeqName1', 'fastaSeqName2'];
  let parsedNameSource = null;

  function resetFastaForm() {
    parsedNameSource = null;
    actions.resetFields(formFields);
    actions.clearFieldErrors(formFields);
  }

  function processFastaTextarea(fastaId, sequenceId, structureId) {
    const input = fields[fastaId];
    if (typeof input !== 'string' || !input.trim().startsWith('>')) return false;
    const records = parseFasta(input);
    if (!records.length) return false;
    fields[sequenceId] = records.map(record => record.sequence).join('&');
    if (structureId) {
      fields[structureId] = records.every(record => typeof record.structure === 'string' && record.structure.length > 0)
        ? records.map(record => record.structure).join('&') : '';
    }
    // Submitting revalidates the source. Preserve names edited in the dialog
    // unless the FASTA text itself changes and introduces new header tokens.
    if (input !== parsedNameSource) {
      fields.fastaSeqName1 = api.normalizeSequenceName(records[0]?.id || '', '1');
      fields.fastaSeqName2 = api.normalizeSequenceName(records[1]?.id || '', '2');
      parsedNameSource = input;
    }
    return true;
  }

  function validateFastaForm() {
    actions.clearFieldErrors(formFields);
    const text = String(fields.fastaInput || '').trim();
    if (!text) {
      actions.setFieldError('fastaInput', 'FASTA input cannot be empty.');
      return false;
    }
    const lines = text.split(/\r?\n/);
    if (!lines[0].startsWith('>')) {
      actions.setFieldError('fastaInput', 'FASTA input must start with a header line beginning with ">".');
      return false;
    }
    if (lines.length < 2 || lines.slice(1).every(line => !line.trim())) {
      actions.setFieldError('fastaInput', 'FASTA input must contain at least one sequence line after the header.');
      return false;
    }
    try {
      if (!processFastaTextarea('fastaInput', 'fastaSequence', 'fastaStructure')) return false;
    } catch (error) {
      actions.setFieldError('fastaInput', error.message);
      return false;
    }
    const sequence = String(fields.fastaSequence || '').trim();
    const structure = String(fields.fastaStructure || '').trim();
    for (const number of ['1', '2']) {
      try { api.normalizeSequenceName(fields[`fastaSeqName${number}`], number); }
      catch (error) { actions.setFieldError(`fastaSeqName${number}`, error.message); return false; }
    }
    try {
      if (sequence) api.validateSequenceInput(sequence);
    } catch (error) {
      actions.setFieldError('fastaSequence', error.message);
      return false;
    }
    try {
      if (structure) api.validateStructureInput(structure, sequence);
    } catch (error) {
      actions.setFieldError('fastaStructure', error.message);
      return false;
    }
    return true;
  }

  function submitFastaForm() {
    if (!validateFastaForm()) return false;
    fields.sequence = fields.fastaSequence;
    fields.seqName1 = api.normalizeSequenceName(fields.fastaSeqName1, '1');
    fields.seqName2 = api.normalizeSequenceName(fields.fastaSeqName2, '2');
    api.setSequenceNames({ seqName1: fields.seqName1, seqName2: fields.seqName2 });
    actions.syncAnnotations();
    if (String(fields.fastaStructure || '').trim()) fields.structure = fields.fastaStructure;
    resetFastaForm();
    actions.runVisualization();
    return true;
  }

  return { parseFasta, processFastaTextarea, resetFastaForm, validateFastaForm, submitFastaForm };
}
