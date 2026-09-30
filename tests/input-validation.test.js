import vaRRI from '../src/vaRRI.js';

describe('splitAtAmpersand', () => {
    test('splits at the first & character', () => {
        expect(vaRRI.splitAtAmpersand('ABC&DEF')).toEqual(['ABC', 'DEF']);
    });

    test('returns [str, ""] when no & is present', () => {
        expect(vaRRI.splitAtAmpersand('ABCDEF')).toEqual(['ABCDEF', '']);
    });

    test('handles & at the start', () => {
        expect(vaRRI.splitAtAmpersand('&DEF')).toEqual(['', 'DEF']);
    });

    test('only splits at the first & when multiple are present', () => {
        expect(vaRRI.splitAtAmpersand('A&B&C')).toEqual(['A', 'B&C']);
    });
});

describe('checkStructureInputSimple', () => {
    test('accepts balanced round brackets', () => {
        expect(() => vaRRI.checkStructureInputSimple('((..))')).not.toThrow();
    });

    test('accepts balanced square brackets', () => {
        expect(() => vaRRI.checkStructureInputSimple('[..[..]..]')).not.toThrow();
    });

    test('accepts dots only', () => {
        expect(() => vaRRI.checkStructureInputSimple('....')).not.toThrow();
    });

    test('accepts mixed bracket types', () => {
        expect(() => vaRRI.checkStructureInputSimple('(.[.])')).not.toThrow();
    });

    test('accepts structure with & separator', () => {
        expect(() => vaRRI.checkStructureInputSimple('((..&..))')).not.toThrow();
    });

    test('throws on too many closing brackets', () => {
        expect(() => vaRRI.checkStructureInputSimple('(..))')).toThrow(/Too many closing/);
    });

    test('throws on too many opening brackets', () => {
        expect(() => vaRRI.checkStructureInputSimple('((..)')).toThrow(/Too many opening/);
    });
});

describe('findBasePairs', () => {
    test('returns empty array for structure without basepairs', () => {
        expect(vaRRI.findBasePairs('....')).toEqual([]);
    });

    test('finds a single basepair', () => {
        expect(vaRRI.findBasePairs('(.)')).toEqual([[0, 2]]);
    });

    test('finds nested basepairs (inner pair listed before outer)', () => {
        // Inner pair [1,4] is pushed first, then outer [0,5]
        expect(vaRRI.findBasePairs('((..))')).toEqual([[1, 4], [0, 5]]);
    });

    test('finds basepairs with square brackets', () => {
        expect(vaRRI.findBasePairs('[..]')).toEqual([[0, 3]]);
    });

    test('ignores unmatched closing bracket', () => {
        // ')' at position 0 has no opener; findBasePairs silently skips it
        expect(vaRRI.findBasePairs(')(.)')).toEqual([[1, 3]]);
    });
});

describe('validateSequenceInput', () => {
    test('accepts a valid RNA sequence', () => {
        expect(vaRRI.validateSequenceInput('ACGU')).toBe('ACGU');
    });

    test('accepts lower-case IUPAC characters', () => {
        expect(vaRRI.validateSequenceInput('acgu')).toBe('acgu');
    });

    test('accepts a two-molecule sequence separated by &', () => {
        expect(vaRRI.validateSequenceInput('ACGU&CGUC')).toBe('ACGU&CGUC');
    });

    test('accepts all IUPAC ambiguity codes', () => {
        expect(() => vaRRI.validateSequenceInput('ACGTURYMSKWBDHVN')).not.toThrow();
    });

    test('throws on empty sequence', () => {
        expect(() => vaRRI.validateSequenceInput('')).toThrow('No sequence given');
    });

    test('throws on invalid characters', () => {
        expect(() => vaRRI.validateSequenceInput('ACGUZ')).toThrow(/invalid none-IUPAC characters/);
    });
});

describe('validateStructureInput', () => {
    test('accepts a valid single-molecule structure', () => {
        expect(vaRRI.validateStructureInput('((..))', 'ACGCGU')).toBe('((..))');;
    });

    test('accepts a valid two-molecule structure', () => {
        expect(vaRRI.validateStructureInput('((..&..))', 'ACGU&CGUC')).toBe('((..&..))');
    });

    test('throws on empty structure', () => {
        expect(() => vaRRI.validateStructureInput('', 'ACGU')).toThrow('No structure given');
    });

    test('throws when structure and sequence lengths differ (single mol)', () => {
        expect(() => vaRRI.validateStructureInput('((..)', 'ACG')).toThrow(/do not match/);
    });

    test('throws when first molecule lengths differ (two mol)', () => {
        expect(() => vaRRI.validateStructureInput('(..&..)', 'ACGU&CG')).toThrow(/molecule 1/);
    });

    test('throws when second molecule lengths differ (two mol)', () => {
        expect(() => vaRRI.validateStructureInput('(..&....)', 'ACG&CGU')).toThrow(/molecule 2/);
    });

    test('throws on unbalanced brackets', () => {
        expect(() => vaRRI.validateStructureInput('((..)', 'ACGCG')).toThrow(/brackets/);
    });
});

describe('validateOffset', () => {
    test('returns 1 for "1"', () => {
        expect(vaRRI.validateOffset('1')).toBe(1);
    });

    test('returns negative integers', () => {
        expect(vaRRI.validateOffset('-5')).toBe(-5);
    });

    test('returns large positive integers', () => {
        expect(vaRRI.validateOffset('100')).toBe(100);
    });

    test('throws for "0"', () => {
        expect(() => vaRRI.validateOffset('0')).toThrow('Index 0 is not valid');
    });

    test('throws for non-numeric input', () => {
        expect(() => vaRRI.validateOffset('abc')).toThrow(/not valid/);
    });

    test('throws for decimal input', () => {
        expect(() => vaRRI.validateOffset('1.5')).toThrow(/not valid/);
    });
});

describe('validateHighlighting', () => {
    test.each(['nothing', 'basepairs', 'region'])('accepts "%s"', (v) => {
        expect(vaRRI.validateHighlighting(v)).toBe(v);
    });

    test('throws on unknown value', () => {
        expect(() => vaRRI.validateHighlighting('bold')).toThrow(/not accepted/);
    });
});

describe('validateBackgroundhighlighting', () => {
    test.each(['nothing', 'basepairs', 'region'])('accepts "%s"', (v) => {
        expect(vaRRI.validateBackgroundhighlighting(v)).toBe(v);
    });

    test('throws on unknown value', () => {
        expect(() => vaRRI.validateBackgroundhighlighting('outline')).toThrow(/not accepted/);
    });
});
