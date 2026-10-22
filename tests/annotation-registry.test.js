import vaRRI from '../src/vaRRI.js';

describe('subsequence highlight registry', () => {
    beforeEach(() => {
        vaRRI.clearSubsequenceHighlights();
    });

    test('creates a normalized highlight object from string input', () => {
        const highlight = vaRRI.createSubsequenceHighlight({
            sequence: 1,
            range: '3-8',
            color: '#123456',
        });

        expect(highlight.sequence).toBe('1');
        expect(highlight.range).toEqual([[3, 8]]);
        expect(highlight.rangeText).toBe('3-8');
        expect(highlight.color).toBe('#123456');
        expect(highlight.alpha).toBe(0.3);  // should be default alpha value
    });

    test('registers, updates and removes highlights by id', () => {
        const added = vaRRI.registerSubsequenceHighlight({
            sequence: '1',
            range: '2-4',
            color: '#abcdef',
        });

        expect(added.id).toBe(1);
        expect(vaRRI.getSubsequenceHighlights()).toHaveLength(1);

        const updated = vaRRI.updateSubsequenceHighlight(added.id, {
            sequence: '2',
            range: '5-7',
            color: '#111111',
        });

        expect(updated.sequence).toBe('2');
        expect(updated.rangeText).toBe('5-7');
        expect(updated.color).toBe('#111111');

        expect(vaRRI.removeSubsequenceHighlight(added.id)).toBe(true);
        expect(vaRRI.getSubsequenceHighlights()).toHaveLength(0);
    });

    test('validates highlight ranges against sequence context', () => {
        expect(() => vaRRI.registerSubsequenceHighlight(
            { sequence: '1', range: '-2-3', color: '#000000' },
            { '1': { offset: -2, length: 4 } }
        )).toThrow(/valid sequence indices/);
    });
});

describe('region highlight registry', () => {
    beforeEach(() => {
        vaRRI.clearRegionHighlights();
    });

    function validateBackgroundHighlight(backgroundhighlighting) {
        return vaRRI.validate({
            structure: '((..&..))',
            sequence: 'ACGU&CGUC',
            startIndex1: '-2',
            startIndex2: '100',
            labelInterval: '10',
            coloring: 'strand',
            highlighting: 'region',
            backgroundhighlighting,
            distinctBpTypes: true,
        });
    }

    function expectTrueSequenceRanges(region) {
        expect(region.sequence1Range).toEqual([-2, -1]);
        expect(region.sequence2Range).toEqual([102, 103]);
    }

    test('creates a normalized region highlight object from string input', () => {
        const highlight = vaRRI.createRegionHighlight({
            sequence1Range: '3-8',
            sequence2Range: '10-12',
            color: '#123456',
            generated: true,
        });

        expect(highlight.sequence1Range).toEqual([3, 8]);
        expect(highlight.sequence2Range).toEqual([10, 12]);
        expect(highlight.rangeText).toBe('3-8&10-12');
        expect(highlight.color).toBe('#123456');
        expect(highlight.alpha).toBe(0.2);  // should be default alpha value
        expect(highlight.generated).toBe(true);
    });

    test('computes generated background region ranges as true sequence positions, not raw node ids', () => {
        const v = validateBackgroundHighlight('region');

        const ranges = vaRRI.computeBackgroundRegionRanges(v);
        expectTrueSequenceRanges(ranges);
    });

    test('registers generated region highlights using true sequence positions', () => {
        const v = validateBackgroundHighlight('region');

        vaRRI.backgroundhighlightRegion(v);
        const generated = vaRRI.getRegionHighlights().find(h => h.generated);
        expectTrueSequenceRanges(generated);
    });

    test('registers generated basepair-stack highlights using true sequence positions', () => {
        const v = validateBackgroundHighlight('basepairs');

        vaRRI.backgroundhighlightBasepairs(v);
        const generated = vaRRI.getRegionHighlights().find(h => h.generated);
        expectTrueSequenceRanges(generated);
    });

    test('registers, updates and removes region highlights by id', () => {
        const added = vaRRI.registerRegionHighlight({
            sequence1Range: '2-4',
            sequence2Range: '5-7',
            color: '#abcdef',
        });

        expect(added.id).toBe(1);
        expect(vaRRI.getRegionHighlights()).toHaveLength(1);

        const updated = vaRRI.updateRegionHighlight(added.id, {
            sequence1Range: '6-8',
            sequence2Range: '9-10',
            color: '#111111',
            generated: true,
        });

        expect(updated.sequence1Range).toEqual([6, 8]);
        expect(updated.sequence2Range).toEqual([9, 10]);
        expect(updated.generated).toBe(true);
        expect(updated.color).toBe('#111111');

        expect(vaRRI.removeRegionHighlight(added.id)).toBe(true);
        expect(vaRRI.getRegionHighlights()).toHaveLength(0);
    });

    test('validates region ranges against sequence context', () => {
        expect(() => vaRRI.registerRegionHighlight(
            { sequence1Range: '-2-3', sequence2Range: '1-2', color: '#000000' },
            { '1': { offset: -2, length: 4 }, '2': { offset: 1, length: 4 } }
        )).toThrow(/valid sequence indices/);
    });
});

describe('point mutation registry', () => {
    beforeEach(() => {
        vaRRI.clearPointMutations();
    });

    test('creates a normalized mutation object from string input', () => {
        const mutation = vaRRI.createPointMutation(
            { sequence: 1, position: 2, replacement: 'g' },
            { '1': { offset: 1, sequence: 'ACGU' } }
        );

        expect(mutation.sequence).toBe('1');
        expect(mutation.position).toBe(2);
        expect(mutation.replacement).toBe('g');
        expect(mutation.reference).toBe('C');
        expect(mutation.labelText).toBe('C2g');
    });

    test('accepts any single letter replacement', () => {
        const mutation = vaRRI.createPointMutation(
            { sequence: '2', position: 110, replacement: 'x' },
            { '2': { offset: 110, sequence: 'ACG' } }
        );

        expect(mutation.replacement).toBe('x');
        expect(mutation.labelText).toBe('A110x');
    });

    test('registers, updates and removes mutations by id', () => {
        const added = vaRRI.registerPointMutation(
            { sequence: '1', position: 2, replacement: 'G', color: '#abcdef' },
            { '1': { offset: 1, sequence: 'ACGU' } }
        );

        expect(added.id).toBe(1);
        expect(vaRRI.getPointMutations()).toHaveLength(1);

        const updated = vaRRI.updatePointMutation(added.id, {
            sequence: '1',
            position: 4,
            replacement: 'A',
            color: '#111111',
        }, { '1': { offset: 1, sequence: 'ACGU' } });

        expect(updated.position).toBe(4);
        expect(updated.replacement).toBe('A');
        expect(updated.color).toBe('#111111');

        expect(vaRRI.removePointMutation(added.id)).toBe(true);
        expect(vaRRI.getPointMutations()).toHaveLength(0);
    });
});
