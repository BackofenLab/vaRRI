import vaRRI from '../src/vaRRI.js';

describe('formatStructure', () => {
    test('handles single-molecule structure', () => {
        const result = vaRRI.formatStructure('((..))');;
        expect(result.structure1).toBe('((..))');;
        expect(result.structure2).toBe('');
        expect(result.structure).toBe('((..))');;
    });

    test('preserves the explicit boundary in a two-molecule structure', () => {
        const result = vaRRI.formatStructure('((..&..))');
        expect(result.structure1).toBe("((..");
        expect(result.structure2).toBe("..))");
        expect(result.structure).toBe('((..&..))');    });

    test('structure_dict maps 1-based positions for two-molecule structure', () => {
        const result = vaRRI.formatStructure('((..&..))');
        // The boundary is metadata; the eight real nucleotides have contiguous IDs.
        expect(result.structure_dict['1']).toBe('(');
        expect(result.structure_dict['2']).toBe('(');
        expect(result.structure_dict['8']).toBe(')');
    });
});

describe('formatSequence', () => {
    test('handles single-molecule sequence', () => {
        const result = vaRRI.formatSequence('ACGU');
        expect(result.sequence1).toBe('ACGU');
        expect(result.sequence2).toBe('');
        expect(result.sequence).toBe('ACGU');
    });

    test('preserves the explicit boundary in a two-molecule sequence', () => {
        const result = vaRRI.formatSequence('ACGU&CGUC');
        expect(result.sequence1).toBe('ACGU');
        expect(result.sequence2).toBe('CGUC');
        expect(result.sequence).toBe('ACGU&CGUC');
    });

    test('sequence_dict maps only real nucleotides to contiguous 1-based positions', () => {
        const result = vaRRI.formatSequence('ACGU&CGUC');
        // The first nucleotide of strand two immediately follows strand one.
        expect(result.sequence_dict['1']).toBe('A');
        expect(result.sequence_dict['4']).toBe('U');
        expect(result.sequence_dict['5']).toBe('C');
        expect(result.sequence_dict['8']).toBe('C');
    });
});

describe('getMolecules', () => {
    test('returns "2" when sequence2 is non-empty', () => {
        expect(vaRRI.getMolecules({ sequence2: 'ACG' })).toBe('2');
    });

    test('returns "1" when sequence2 is empty', () => {
        expect(vaRRI.getMolecules({ sequence2: '' })).toBe('1');
    });
});

describe('getSequenceIndices', () => {
    test('generates consecutive indices starting at positive offset', () => {
        expect(vaRRI.getSequenceIndices('s1', 1, 3)).toEqual([
            ['s1', 1], ['s1', 2], ['s1', 3],
        ]);
    });

    test('skips 0 and extends the last index when range crosses zero', () => {
        // offset=-1, length=3 → would give -1,0,1 → skips 0 → yields -1,1,2
        expect(vaRRI.getSequenceIndices('s1', -1, 3)).toEqual([
            ['s1', -1], ['s1', 1], ['s1', 2],
        ]);
    });

    test('labels indices with the given sequence id', () => {
        const result = vaRRI.getSequenceIndices('s2', 5, 2);
        expect(result.every(([id]) => id === 's2')).toBe(true);
    });
});

describe('getIndexDictionary', () => {
    test('builds a contiguous 1-based dictionary across both molecules', () => {
        const v = { offset1: 1, offset2: 1, sequence1: 'ACG', sequence2: 'GC' };
        const dict = vaRRI.getIndexDictionary(v);
        // s1: keys 1-3, s2: keys 4-5
        expect(dict[1]).toEqual(['s1', 1]);
        expect(dict[3]).toEqual(['s1', 3]);
        expect(dict[4]).toEqual(['s2', 1]);
        expect(dict[5]).toEqual(['s2', 2]);
        expect(dict[6]).toBeUndefined();
    });

    test('total length equals the number of real nucleotides', () => {
        const v = { offset1: 1, offset2: 1, sequence1: 'ACGU', sequence2: 'GCU' };
        const dict = vaRRI.getIndexDictionary(v);
        expect(Object.keys(dict).length).toBe(4 + 3);
    });
});

describe('parseSubsequences', () => {
    test('returns null for null input', () => {
        expect(vaRRI.parseSubsequences(null)).toBeNull();
    });

    test('returns null for empty string', () => {
        expect(vaRRI.parseSubsequences('')).toBeNull();
    });

    test('parses a single range', () => {
        expect(vaRRI.parseSubsequences('3-8')).toEqual([[3, 8]]);
    });

    test('parses multiple comma-separated ranges', () => {
        expect(vaRRI.parseSubsequences('3-8,15-20')).toEqual([[3, 8], [15, 20]]);
    });

    test('parses negative index ranges', () => {
        expect(vaRRI.parseSubsequences('-3--1')).toEqual([[-3, -1]]);
    });

    test('validates range endpoints against sequence indices when context is provided', () => {
        // offset=-2, length=4 => valid indices: -2, -1, 1, 2
        expect(vaRRI.parseSubsequences('-2-2', -2, 4)).toEqual([[-2, 2]]);
        expect(() => vaRRI.parseSubsequences('-2-3', -2, 4)).toThrow(/valid sequence indices/);
    });

    test('rejects index 0 in a range', () => {
        expect(() => vaRRI.parseSubsequences('0-2')).toThrow(/Index 0 is not valid/);
    });

    test('throws on malformed range (not two parts)', () => {
        expect(() => vaRRI.parseSubsequences('3-8-9')).toThrow(/Invalid subsequence range/);
    });

    test('throws on non-numeric range', () => {
        expect(() => vaRRI.parseSubsequences('a-b')).toThrow(/Invalid subsequence range/);
    });
});
