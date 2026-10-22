

/**
 * Split a string at the first `&` character.
 *
 * Always returns exactly two strings; the second is empty when `&` is absent.
 *
 * @param {string} str
 * @returns {[string, string]}
 */
export function splitAtAmpersand(str) {
  const idx = str.indexOf('&');
  if (idx === -1) return [str, ''];
  return [str.slice(0, idx), str.slice(idx + 1)];
}

/**
 * Validate a structure string for correctly-paired brackets.
 *
 * Ensures `()`, `<>`, `[]`, `{}` are properly opened and closed.
 *
 * @param {string} structure  Dot-bracket structure, may contain `&`.
 * @throws {Error} When bracket counts do not balance.
 */
export function checkStructureInputSimple(structure) {
  const basepairs = {
    '(': 0,
    '<': 0,
    '[': 0,
    '{': 0
  };
  const closingBp = {
    ')': '(',
    '>': '<',
    ']': '[',
    '}': '{'
  };
  for (const char of structure) {
    if (char in basepairs) {
      basepairs[char]++;
    } else if (char in closingBp) {
      const open = closingBp[char];
      basepairs[open]--;
      if (basepairs[open] < 0) {
        throw new Error(`The number of brackets does not line up. Too many closing ${char} brackets:\n${structure}`);
      }
    }
  }
  for (const [bp, count] of Object.entries(basepairs)) {
    if (count > 0) {
      throw new Error(`The number of brackets does not line up. Too many opening ${bp} brackets:\n${structure}`);
    }
  }
}

/**
 * Find base-pair indices in a dot-bracket structure string.
 *
 * @param {string} structure
 * @returns {Array<[number, number]>}  List of [open, close] index pairs (0-based).
 */
export function findBasePairs(structure) {
  const basepairList = [];
  const openBasepairs = {
    '(': [],
    '<': [],
    '[': [],
    '{': []
  };
  const closingBp = {
    ')': '(',
    '>': '<',
    ']': '[',
    '}': '{'
  };
  for (let i = 0; i < structure.length; i++) {
    const char = structure[i];
    if (char in openBasepairs) {
      openBasepairs[char].push(i);
    } else if (char in closingBp) {
      const open = closingBp[char];
      if (openBasepairs[open].length > 0) {
        const openIdx = openBasepairs[open].pop();
        basepairList.push([openIdx, i]);
      }
    }
  }
  return basepairList;
}

/**
 * Identify intermolecular basepair positions in a structure string.
 *
 * Analyses a dot-bracket structure and returns positions involved in
 * intermolecular basepairs.  Unmatched opening or closing brackets are
 * considered intermolecular.
 *
 * Supports `()`, `[]`, `{}`, `<>` bracket types independently.
 *
 * @param {string} struc  Structure string in dot-bracket notation.
 * @param {number} [shift=0]  Offset added to every returned index.
 * @returns {Array<[number, string]>}  Sorted list of [1-based index, bracket] pairs.
 */
export function listIntermolNodes(struc, shift = 0) {
  const interBasepairs = [];
  const openBasepairs = {
    '(': [],
    '<': [],
    '[': [],
    '{': []
  };
  const bracketPairs = [['(', ')'], ['[', ']'], ['{', '}'], ['<', '>']];
  for (let i = 0; i < struc.length; i++) {
    const char = struc[i];
    const index = i + 1; // 1-based
    for (const [open, close] of bracketPairs) {
      if (char === open) {
        openBasepairs[open].push([index + shift, char]);
        break;
      }
      if (char === close) {
        if (openBasepairs[open].length > 0) {
          openBasepairs[open].pop();
        } else {
          interBasepairs.push([index + shift, char]);
        }
        break;
      }
    }
  }
  for (const pairs of Object.values(openBasepairs)) {
    interBasepairs.push(...pairs);
  }
  interBasepairs.sort((a, b) => a[0] - b[0]);
  return interBasepairs;
}
