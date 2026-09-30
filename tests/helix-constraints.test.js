import vaRRI from '../src/vaRRI.js';
import {
  validateLinearHelixFixture,
  constraintEndpoints,
  createLinearHelixTestNode,
  createLinearHelixTestLabel,
  createLinearHelixTestContainer,
  linearHelixConstraintSummary,
  linearHelixNode,
  linearHelixVector,
  linearHelixVectorLength,
  linearHelixDot,
  linearHelixCross,
  linearHelixExteriorScore,
  linearHelixNucleotideCoordinateSnapshot,
  expectLinearHelixNucleotideCoordinatesUnchanged,
  linearHelixCoordinateSnapshot,
  expectLinearHelixCoordinatesClose,
  linearHelixPairwiseDistanceSnapshot,
  expectLinearHelixPairwiseDistancesPreserved,
  linearHelixPairCenters,
  expectLinearHelixHorizontalAxis,
  linearHelixTransformPoint,
  linearHelixListenerActions,
  expectLinearHelixRailGeometry,
} from './helpers/linear-helix.js';

describe('RRI helix loop constraints', () => {
    test('excludes uninterrupted stacks and interactions with only one pair', () => {
        const stack = validateLinearHelixFixture('AAA&UUU', '(((&)))');
        const single = validateLinearHelixFixture('AAAA&UUUU', '(...&...)');

        [stack, single].forEach(v => {
            expect(vaRRI.listRriLoopBoundaryPairs(v)).toEqual([]);
            expect(vaRRI.getLinearRriConstraintSpecs(v)).toEqual([]);
        });
    });

    test.each([
        {
            name: 'one-sided bulge',
            sequence: 'AAAAA&UU',
            structure: '(...(&))',
            pairs: [[1, 7], [5, 6]],
            boundary: {
                outer: [1, 7],
                inner: [5, 6],
                gaps: [3, 0],
                loopType: 'bulge',
            },
            endpoints: [[1, 5, '1'], [6, 7, '2']],
        },
        {
            name: 'two-sided interior loop',
            sequence: 'AAAA&UUUU',
            structure: '(..(&)..)',
            pairs: [[1, 8], [4, 5]],
            boundary: {
                outer: [1, 8],
                inner: [4, 5],
                gaps: [2, 2],
                loopType: 'interior',
            },
            endpoints: [[1, 4, '1'], [5, 8, '2']],
        },
    ])('identifies an RRI $name', ({
        sequence,
        structure,
        pairs,
        boundary,
        endpoints,
    }) => {
        const v = validateLinearHelixFixture(sequence, structure);

        expect(vaRRI.listIntermolPairs(v)).toEqual(pairs);
        expect(vaRRI.listRriLoopBoundaryPairs(v)).toEqual([boundary]);
        const specs = vaRRI.getLinearRriConstraintSpecs(v);
        expect(constraintEndpoints(specs)).toEqual(endpoints);
        expect(specs.map(spec => [spec.kind, spec.loopType])).toEqual([
            ['rri', boundary.loopType],
            ['rri', boundary.loopType],
        ]);
        expect(specs[0].loopId).toBe(specs[1].loopId);
        expect(specs.every(spec => spec.distanceUnits === undefined)).toBe(true);
    });

    test('uses the exact nesting cover and is invariant to biological offsets', () => {
        const input = ['AAAAA&UUUUU', '((..(&)..))'];
        const v = validateLinearHelixFixture(...input);
        const shifted = validateLinearHelixFixture(...input, {
            startIndex1: '-20',
            startIndex2: '500',
        });
        const expected = [{
            outer: [2, 9],
            inner: [5, 6],
            gaps: [2, 2],
            loopType: 'interior',
        }];

        expect(vaRRI.listIntermolPairs(v)).toEqual([
            [1, 10],
            [2, 9],
            [5, 6],
        ]);
        expect(vaRRI.listRriLoopBoundaryPairs(v)).toEqual(expected);
        expect(vaRRI.listRriLoopBoundaryPairs(shifted)).toEqual(expected);
        expect(constraintEndpoints(vaRRI.getLinearRriConstraintSpecs(v)))
            .toEqual([[2, 5, '1'], [6, 9, '2']]);
        expect(vaRRI.getLinearRriConstraintSpecs(shifted))
            .toEqual(vaRRI.getLinearRriConstraintSpecs(v));
    });

    test('conservatively excludes candidates touched by a crossing pair', () => {
        const v = validateLinearHelixFixture(
            'AAAA&UUUUUUUUU',
            '([.{&...}...)]'
        );

        expect(vaRRI.listIntermolPairs(v)).toEqual([
            [1, 12],
            [2, 13],
            [4, 8],
        ]);
        expect(vaRRI.listRriLoopBoundaryPairs(v)).toEqual([]);
        expect(vaRRI.getLinearRriConstraintSpecs(v)).toEqual([]);
    });
});

describe('intramolecular helix loop constraints', () => {
    test.each([
        ['stack ending in a hairpin', 'AAAAAAAAA', '(((...)))'],
        ['single-pair hairpin', 'AAAAA', '(...)'],
        ['separate stems', 'AAAAAAAAAAAAAA', '((..))..((..))'],
        ['multibranch loop', 'AAAAAAAAAA', '((..)(..))'],
    ])('excludes a %s', (_name, sequence, structure) => {
        const v = validateLinearHelixFixture(sequence, structure);

        expect(vaRRI.listStructureLoopBoundaryPairs(v)).toEqual([]);
        expect(vaRRI.getLinearStructureConstraintSpecs(v)).toEqual([]);
    });

    test.each([
        {
            name: 'bulge',
            sequence: 'AAAAAAAAA',
            structure: '((...()))',
            boundary: {
                outer: [2, 8],
                inner: [6, 7],
                gaps: [3, 0],
                loopType: 'bulge',
                sequence: '1',
            },
            endpoints: [[2, 6, '1'], [7, 8, '1']],
        },
        {
            name: 'interior loop',
            sequence: 'AAAAAAAAAAAA',
            structure: '((..(..)..))',
            boundary: {
                outer: [2, 11],
                inner: [5, 8],
                gaps: [2, 2],
                loopType: 'interior',
                sequence: '1',
            },
            endpoints: [[2, 5, '1'], [8, 11, '1']],
        },
    ])('identifies an intramolecular $name', ({
        sequence,
        structure,
        boundary,
        endpoints,
    }) => {
        const v = validateLinearHelixFixture(sequence, structure);

        expect(vaRRI.listStructureLoopBoundaryPairs(v)).toEqual([boundary]);
        const specs = vaRRI.getLinearStructureConstraintSpecs(v);
        expect(constraintEndpoints(specs)).toEqual(endpoints);
        expect(specs.map(spec => [spec.kind, spec.loopType])).toEqual([
            ['structure', boundary.loopType],
            ['structure', boundary.loopType],
        ]);
        expect(specs[0].loopId).toBe(specs[1].loopId);
    });

    test('maps both strands with contiguous nucleotide IDs', () => {
        const v = validateLinearHelixFixture(
            'AAAAAAAAAAAA&UUUUUUUUU',
            '((..(..)..))&((...()))'
        );

        expect(vaRRI.listStructureLoopBoundaryPairs(v)).toEqual([
            {
                outer: [2, 11],
                inner: [5, 8],
                gaps: [2, 2],
                loopType: 'interior',
                sequence: '1',
            },
            {
                outer: [14, 20],
                inner: [18, 19],
                gaps: [3, 0],
                loopType: 'bulge',
                sequence: '2',
            },
        ]);
        expect(constraintEndpoints(vaRRI.getLinearStructureConstraintSpecs(v)))
            .toEqual([
                [2, 5, '1'],
                [8, 11, '1'],
                [14, 18, '2'],
                [19, 20, '2'],
            ]);
    });

    test('conservatively excludes candidates touched by crossing pairs', () => {
        const v = validateLinearHelixFixture('AAAAAAAAAAA', '([.{..}..)]');

        expect(vaRRI.listStructureLoopBoundaryPairs(v)).toEqual([]);
        expect(vaRRI.getLinearStructureConstraintSpecs(v)).toEqual([]);
    });
});
