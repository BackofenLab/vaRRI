import vaRRI from '../src/vaRRI.js';

describe('polygon helpers', () => {
    test('closes point lists for filled polygons', () => {
        expect(vaRRI.closePolygonPoints([[10, 20], [30, 40], [50, 60]])).toEqual([
            '10,20',
            '30,40',
            '50,60',
            '10,20',
        ]);
    });

    test('resolves region node paths from true sequence positions', () => {
        const v = {
            offset1: 1,
            offset2: 1,
            sequence1: 'AC',
            sequence2: 'GU',
        };

        expect(vaRRI.getRegionHighlightNodePath(v, {
            sequence1Range: [1, 2],
            sequence2Range: [1, 2],
        })).toEqual([1, 2, 3, 4]);
    });
});

describe('listIntermolNodes', () => {
    test('returns empty array for structure with no intermolecular basepairs', () => {
        expect(vaRRI.listIntermolNodes('((..))')).toEqual([]);
    });

    test('returns empty array for dots-only structure', () => {
        expect(vaRRI.listIntermolNodes('....')).toEqual([]);
    });

    test('identifies unmatched opening brackets as intermolecular', () => {
        // '((..' has two unmatched opens at positions 1 and 2
        expect(vaRRI.listIntermolNodes('((..')).toEqual([[1, '('], [2, '(']]);
    });

    test('identifies unmatched closing brackets as intermolecular', () => {
        // '..)' has one unmatched close at position 3
        expect(vaRRI.listIntermolNodes('..)')).toEqual([[3, ')']]);
    });

    test('applies a shift to all returned positions', () => {
        expect(vaRRI.listIntermolNodes('..)', 10)).toEqual([[13, ')']]);
    });

    test('returns sorted results by position', () => {
        const result = vaRRI.listIntermolNodes('((..');
        const positions = result.map(([pos]) => pos);
        expect(positions).toEqual([...positions].sort((a, b) => a - b));
    });
});

describe('listBasepairs', () => {
    test('returns empty array for all-dot structure', () => {
        const struc = { 1: '.', 2: '.', 3: '.' };
        expect(vaRRI.listBasepairs(struc)).toEqual([]);
    });

    test('finds a single basepair', () => {
        const struc = { 1: '(', 2: '.', 3: '.', 4: ')' };
        expect(vaRRI.listBasepairs(struc)).toEqual([[1, 4]]);
    });

    test('returns basepairs sorted by opening position', () => {
        const struc = { 1: '(', 2: '(', 3: ')', 4: ')' };
        const result = vaRRI.listBasepairs(struc);
        const openPositions = result.map(([o]) => o);
        expect(openPositions).toEqual([...openPositions].sort((a, b) => a - b));
    });
});

describe('getIntermolBasepairRegion', () => {
    test('returns empty array when there are no intermolecular basepairs', () => {
        // Both structures fully self-paired
        expect(vaRRI.getIntermolBasepairRegion('((..))', '((..))')).toEqual([]);
    });

    test('returns empty array when one structure has no intermolecular nodes', () => {
        expect(vaRRI.getIntermolBasepairRegion('....', '((...))')).toEqual([]);
    });

    test('returns the [first,last] range for each molecule', () => {
        // structure1 = '((..' → unmatched opens at 1,2
        // structure2 = '..))'  with shift = len('((..') = 4
        //              unmatched closes at 3,4 → positions 7,8
        const result = vaRRI.getIntermolBasepairRegion('((..',  '..))');;
        expect(result).toEqual([[1, 2], [7, 8]]);
    });

    test('returns single-element range when only one intermolecular node per molecule', () => {
        // structure1 = '(..' → unmatched open at 1
        // structure2 = '..)'  with shift = 3 → unmatched close at pos 3 → 6
        const result = vaRRI.getIntermolBasepairRegion('(..', '..)');
        expect(result).toEqual([[1, 1], [6, 6]]);
    });
});
