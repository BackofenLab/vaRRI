/** Parse FASTA and optional dot-bracket records without touching UI state. */
export function parseFasta(input) {
  if (typeof input !== 'string') {
    throw new TypeError('Input must be a string.');
  }
  const lines = input.split(/\r?\n/);
  const records = [];
  let currentHeader = null;
  let currentLines = [];

  // Allowed Alphabets
  const SEQ_REGEX = /^[a-zA-Z]+$/;
  const STRUCT_REGEX = /^[.()\[\]<>{}]+$/;
  function finalizeRecord(header, rawContentLines) {
    const trimmedHeader = header.trim();
    const firstSpaceIdx = trimmedHeader.search(/\s/);
    const id = firstSpaceIdx === -1 ? trimmedHeader : trimmedHeader.slice(0, firstSpaceIdx);
    const description = firstSpaceIdx === -1 ? '' : trimmedHeader.slice(firstSpaceIdx + 1).trim();

    // Strip all inline whitespace from sequence/structure lines
    const cleanedLines = rawContentLines.map(l => l.replace(/\s+/g, ''));
    if (cleanedLines.length === 0) {
      throw new Error(`Record ">${id}" contains no sequence data.`);
    }

    // Check if the second line is a secondary structure string
    const isSecondLineStructure = cleanedLines.length >= 2 && STRUCT_REGEX.test(cleanedLines[1]) && !SEQ_REGEX.test(cleanedLines[1]);
    if (isSecondLineStructure) {
      // Rule: If structure is provided, ONLY 2 content lines (Seq + Struct) are allowed
      if (cleanedLines.length !== 2) {
        throw new Error(`Record ">${id}" has structure notation, but contains ${cleanedLines.length} lines instead of strictly 2 (1 sequence line + 1 structure line).`);
      }
      const [sequence, structure] = cleanedLines;
      if (!SEQ_REGEX.test(sequence)) {
        throw new Error(`Record ">${id}" sequence line contains invalid characters. Allowed: [a-zA-Z]`);
      }
      return {
        id,
        description,
        header: trimmedHeader,
        sequence,
        structure
      };
    }

    // Multi-line Sequence Case
    for (let i = 0; i < cleanedLines.length; i++) {
      if (!SEQ_REGEX.test(cleanedLines[i])) {
        throw new Error(`Record ">${id}" line ${i + 1} contains invalid characters for sequence: "${rawContentLines[i]}"`);
      }
    }
    return {
      id,
      description,
      header: trimmedHeader,
      sequence: cleanedLines.join(''),
      structure: null
    };
  }

  // Iterative Line Parser
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 1. Skip empty lines
    if (!line) continue;

    // 2. Skip full-line comments (starting with ; or #)
    if (line.startsWith(';') || line.startsWith('#')) continue;

    // 3. Header processing
    if (line.startsWith('>')) {
      if (currentHeader !== null) {
        records.push(finalizeRecord(currentHeader, currentLines));
      }
      currentHeader = line.slice(1);
      currentLines = [];
    } else {
      if (currentHeader === null) {
        throw new Error(`Line ${i + 1}: Found data line before record header ('>')`);
      }
      currentLines.push(line);
    }
  }

  // Flush last record
  if (currentHeader !== null) {
    records.push(finalizeRecord(currentHeader, currentLines));
  }
  return records;
}

/**
 * Reads FASTA input from a sequence textarea, parses it, and populates 
 * sequence and structure textareas with '&'-joined fields.
 * 
 * @param {string} fastaId - DOM ID of the FASTA input textarea.
 * @param {string} sequenceId - DOM ID of the sequence textarea.
 * @param {string} [structureId] - DOM ID of the structure textarea (optional).
 * @returns {boolean} True if processing occurred, false if no FASTA input was found.
 * @throws Will throw an error if the FASTA input is invalid or violates the strict structure rules.
 */
