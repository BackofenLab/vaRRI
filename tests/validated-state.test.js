import vaRRI from '../src/vaRRI.js';

describe('validate', () => {
    const base2mol = {
        structure: '((..&..))',
        sequence: 'ACGU&CGUC',
        startIndex1: '1',
        startIndex2: '1',
        labelInterval: '10',
        coloring: 'strand',
        highlighting: 'region',
        backgroundhighlighting: 'basepairs',
        distinctBpTypes: true,
    };

    test('produces correct molecules count for two-molecule input', () => {
        const v = vaRRI.validate(base2mol);
        expect(v.molecules).toBe('2');
    });

    test('splits sequences correctly for two-molecule input', () => {
        const v = vaRRI.validate(base2mol);
        expect(v.sequence1).toBe('ACGU');
        expect(v.sequence2).toBe('CGUC');
    });

    test('splits structures correctly for two-molecule input', () => {
        const v = vaRRI.validate(base2mol);
        expect(v.structure1).toBe("((..");
        expect(v.structure2).toBe("..))");
    });

    test('stores parsed offsets', () => {
        const v = vaRRI.validate(base2mol);
        expect(v.offset1).toBe(1);
        expect(v.offset2).toBe(1);
    });

    test('produces correct molecules count for single-molecule input', () => {
        const v = vaRRI.validate({
            structure: '((..))',
            sequence: 'ACGCGU',
            startIndex1: '1',
            startIndex2: '1',
        });
        expect(v.molecules).toBe('1');
    });

    test('sets empty subsequenceHighlights when not provided', () => {
        const v = vaRRI.validate(base2mol);
        expect(v.subsequenceHighlights).toEqual([]);
    });

    test('accepts generic subsequenceHighlights objects', () => {
        const v = vaRRI.validate({
            ...base2mol,
            subsequenceHighlights: [
                { sequence: '1', range: '2-4', color: '#123456' },
                { sequence: '2', range: '1-2', color: '#654321' },
            ],
        });

        expect(v.subsequenceHighlights).toHaveLength(2);
        expect(v.subsequenceHighlights[0].sequence).toBe('1');
        expect(v.subsequenceHighlights[0].color).toBe('#123456');
        expect(v.subsequenceHighlights[1].sequence).toBe('2');
    });

    test('accepts pointMutations objects', () => {
        const v = vaRRI.validate({
            ...base2mol,
            pointMutations: [
                { sequence: '1', position: 1, replacement: 'G', color: '#123456' },
            ],
        });

        expect(v.pointMutations).toHaveLength(1);
        expect(v.pointMutations[0].sequence).toBe('1');
        expect(v.pointMutations[0].labelText).toBe('A1G');
        expect(v.pointMutations[0].nodeId).toBeGreaterThan(0);
    });

    test('accepts negative subsequence ranges with negative sequence start index', () => {
        const v = vaRRI.validate({
            ...base2mol,
            startIndex1: '-2',
            subsequenceHighlights: [{ sequence: '1', range: '-2-2', color: '#123456' }],
        });
        expect(v.subsequenceHighlights[0].range).toEqual([[-2, 2]]);
    });

    test('throws when subsequenceHighlights range endpoints are outside valid sequence indices', () => {
        expect(() => vaRRI.validate({
            ...base2mol,
            startIndex1: '-2',
            subsequenceHighlights: [{ sequence: '1', range: '-2-3', color: '#123456' }],
        })).toThrow(/valid sequence indices/);
    });

    test('throws on empty sequence', () => {
        expect(() => vaRRI.validate({ ...base2mol, sequence: '' })).toThrow();
    });

    test('throws on empty structure', () => {
        expect(() => vaRRI.validate({ ...base2mol, structure: '' })).toThrow();
    });

    test('throws on structure/sequence length mismatch', () => {
        expect(() => vaRRI.validate({ ...base2mol, sequence: 'ACG&CGUC' })).toThrow();
    });

    test('throws on invalid offset (0)', () => {
        expect(() => vaRRI.validate({ ...base2mol, startIndex1: '0' })).toThrow();
    });

    test('throws on invalid highlighting value', () => {
        expect(() => vaRRI.validate({ ...base2mol, highlighting: 'bright' })).toThrow();
    });
});
