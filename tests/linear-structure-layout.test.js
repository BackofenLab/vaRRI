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

describe('applyLinearHelixSprings', () => {
test('orients current and previous clouds independently without distortion', () => {
        const v = validateLinearHelixFixture('AAAAA&UUUUU', '((..(&)..))');
        const nodes = [
            createLinearHelixTestNode(1, 0, -2, 0),
            createLinearHelixTestNode(10, 0, 2, 0),
            createLinearHelixTestNode(2, 4, -2, 0),
            createLinearHelixTestNode(9, 4, 2, 0),
            createLinearHelixTestNode(5, 16, -2, 0),
            createLinearHelixTestNode(6, 16, 2, 0),
        ];
        nodes.forEach(node => {
            const currentX = node.x;
            const currentY = node.y;
            node.px = 30 - currentY;
            node.py = currentX - 7;
        });
        const currentDistances = linearHelixPairwiseDistanceSnapshot(nodes);
        const previousDistances = linearHelixPairwiseDistanceSnapshot(nodes, 'px', 'py');
        const { container } = createLinearHelixTestContainer(nodes, [], 4);

        expect(vaRRI.applyLinearHelixSprings(container, v, { rri: true }))
            .toBe(2);
        expect(container.varriLinearHelixTemplates[0].reflection).toBe(1);
        expectLinearHelixRailGeometry(
            nodes,
            [[1, 10], [2, 9], [5, 6]],
            [4, 12],
            4
        );
        expectLinearHelixRailGeometry(
            nodes,
            [[1, 10], [2, 9], [5, 6]],
            [4, 12],
            4,
            'px',
            'py'
        );
        expectLinearHelixHorizontalAxis(
            nodes,
            [[1, 10], [2, 9], [5, 6]],
            'x',
            'y',
            1
        );
        expectLinearHelixHorizontalAxis(
            nodes,
            [[1, 10], [2, 9], [5, 6]],
            'px',
            'py',
            1
        );
        expectLinearHelixPairwiseDistancesPreserved(currentDistances, nodes);
        expectLinearHelixPairwiseDistancesPreserved(
            previousDistances,
            nodes,
            'px',
            'py'
        );
    });

test('projects a clean structure stem despite an unrelated crossing pair', () => {
        const structure = '((..(..)..))..([)]';
        const v = validateLinearHelixFixture('A'.repeat(structure.length), structure);
        const nodes = [
            createLinearHelixTestNode(1, -4, -3, 0),
            createLinearHelixTestNode(12, -2, 2, 0),
            createLinearHelixTestNode(2, 0, 0, 0),
            createLinearHelixTestNode(11, 10, 0, 0),
            createLinearHelixTestNode(5, 3, 4, 0),
            createLinearHelixTestNode(8, 10, 12, 0),
            createLinearHelixTestNode(15, 100, 0, 0),
            createLinearHelixTestNode(17, 100, 10, 0),
            createLinearHelixTestNode(16, 110, 0, 0),
            createLinearHelixTestNode(18, 110, 10, 0),
        ];
        const crossingNumbers = new Set([15, 16, 17, 18]);
        const crossingSnapshot = nodes
            .filter(node => crossingNumbers.has(node.num))
            .map(node => ({ ...node }));
        const links = [{ linkType: 'basepair' }];
        const { container, force } = createLinearHelixTestContainer(
            nodes,
            links,
            4
        );

        expect(vaRRI.applyLinearHelixSprings(container, v, { structure: true }))
            .toBe(2);
        expect(linearHelixConstraintSummary(container.varriLinearHelixConstraints))
            .toEqual([
                {
                    endpoints: [2, 5],
                    kind: 'structure',
                    loop: 'structure:1:0',
                    type: 'structure_linear',
                    target: 12,
                    value: 3,
                },
                {
                    endpoints: [8, 11],
                    kind: 'structure',
                    loop: 'structure:1:0',
                    type: 'structure_linear',
                    target: 12,
                    value: 3,
                },
            ]);
        expect(container.varriLinearHelixTemplates).toHaveLength(1);
        expect(container.varriLinearHelixTemplates[0]).toMatchObject({
            kind: 'structure',
            sequence: '1',
            pairs: [[1, 12], [2, 11], [5, 8]],
        });
        expectLinearHelixRailGeometry(
            nodes,
            [[1, 12], [2, 11], [5, 8]],
            [4, 12],
            4
        );
        expect(nodes.filter(node => crossingNumbers.has(node.num)))
            .toEqual(crossingSnapshot);
        nodes.filter(node => crossingNumbers.has(node.num)).forEach(node => {
            expect(node.varriLinearHelix).toBeUndefined();
            expect(node.varriLinearHelixKind).toBeUndefined();
        });
        expect(container.graph.links).toBe(links);
        expect(force.start).toHaveBeenCalledTimes(1);
    });

test('does not globally orient a structure-only stem', () => {
        const v = validateLinearHelixFixture(
            'AAAAAAAAAAAA',
            '((..(..)..))'
        );
        const nodes = [
            createLinearHelixTestNode(1, -2, 0, 0),
            createLinearHelixTestNode(12, 2, 0, 0),
            createLinearHelixTestNode(2, -2, 4, 0),
            createLinearHelixTestNode(11, 2, 4, 0),
            createLinearHelixTestNode(5, -2, 16, 0),
            createLinearHelixTestNode(8, 2, 16, 0),
            createLinearHelixTestNode(99, 30, -20, 0),
        ];
        const coordinateSnapshot = linearHelixCoordinateSnapshot(nodes);
        const { container, force, handlers } = createLinearHelixTestContainer(
            nodes,
            [],
            4
        );

        expect(vaRRI.applyLinearHelixSprings(container, v, { structure: true }))
            .toBe(2);
        expect(container.varriLinearHelixTemplates).toHaveLength(1);
        expect(container.varriLinearHelixTemplates[0]).toMatchObject({
            kind: 'structure',
            sequence: '1',
            pairs: [[1, 12], [2, 11], [5, 8]],
        });
        expect(container.varriLinearHelixTemplates[0].lastHorizontalRotation)
            .toBeUndefined();
        const centers = linearHelixPairCenters(
            nodes,
            [[1, 12], [2, 11], [5, 8]]
        );
        expect(Math.max(...centers.map(center => center.x)) -
            Math.min(...centers.map(center => center.x))).toBeCloseTo(0, 10);
        expect(Math.abs(centers.at(-1).y - centers[0].y)).toBeGreaterThan(1e-8);
        expectLinearHelixCoordinatesClose(coordinateSnapshot);
        handlers['tick.varriLinearHelix']();
        expectLinearHelixCoordinatesClose(coordinateSnapshot);
        expect(linearHelixListenerActions(force)).toEqual([
            ['tick.varriLinearHelix', 'set'],
            ['end.varriLinearHelix', 'set'],
        ]);
        expect(force.start).toHaveBeenCalledTimes(1);
    });

test('combines RRI and structure rail templates without changing graph links', () => {
        const v = validateLinearHelixFixture(
            'AAAAAAAAAAAAAA&UU',
            '((...()))(...(&))'
        );
        const nodes = [
            createLinearHelixTestNode(1, -5, -5, 0),
            createLinearHelixTestNode(9, -4, -1, 0),
            createLinearHelixTestNode(2, 0, 0, 0),
            createLinearHelixTestNode(6, 3, 4, 0),
            createLinearHelixTestNode(7, 10, 0, 0),
            createLinearHelixTestNode(8, 10, 12, 0),
            createLinearHelixTestNode(10, 20, 0, 0),
            createLinearHelixTestNode(14, 20, 6, 0),
            createLinearHelixTestNode(15, 30, 0, 0),
            createLinearHelixTestNode(16, 38, 0, 0),
        ];
        const fixedSnapshot = nodes.map(node => [node.num, node.fixed]);
        const existing = { linkType: 'backbone' };
        const links = [existing];
        const { container, force, handlers } = createLinearHelixTestContainer(
            nodes,
            links,
            2
        );

        expect(vaRRI.applyLinearHelixSprings(container, v, {
            rri: true,
            structure: true,
        })).toBe(4);
        expect(container.graph.links).toBe(links);
        expect(container.graph.links[0]).toBe(existing);
        expect(container.graph.links).toHaveLength(1);
        expect(linearHelixConstraintSummary(container.varriLinearHelixConstraints))
            .toEqual([
                {
                    endpoints: [10, 14],
                    kind: 'rri',
                    loop: 'rri:0',
                    type: 'rri_linear',
                    target: 8,
                    value: 4,
                },
                {
                    endpoints: [15, 16],
                    kind: 'rri',
                    loop: 'rri:0',
                    type: 'rri_linear',
                    target: 8,
                    value: 4,
                },
                {
                    endpoints: [2, 6],
                    kind: 'structure',
                    loop: 'structure:1:0',
                    type: 'structure_linear',
                    target: 12,
                    value: 6,
                },
                {
                    endpoints: [7, 8],
                    kind: 'structure',
                    loop: 'structure:1:0',
                    type: 'structure_linear',
                    target: 12,
                    value: 6,
                },
            ]);
        expect(container.varriLinearHelixTemplates.map(template => template.kind))
            .toEqual(['rri', 'structure']);
        expectLinearHelixRailGeometry(
            nodes,
            [[10, 16], [14, 15]],
            [8],
            2
        );
        expectLinearHelixRailGeometry(
            nodes,
            [[10, 16], [14, 15]],
            [8],
            2,
            'px',
            'py'
        );
        expectLinearHelixRailGeometry(
            nodes,
            [[1, 9], [2, 8], [6, 7]],
            [2, 12],
            2
        );
        expectLinearHelixRailGeometry(
            nodes,
            [[1, 9], [2, 8], [6, 7]],
            [2, 12],
            2,
            'px',
            'py'
        );
        expectLinearHelixHorizontalAxis(
            nodes,
            [[10, 16], [14, 15]]
        );
        expectLinearHelixHorizontalAxis(
            nodes,
            [[10, 16], [14, 15]],
            'px',
            'py'
        );
        handlers['tick.varriLinearHelix']();
        expectLinearHelixHorizontalAxis(
            nodes,
            [[10, 16], [14, 15]]
        );
        expectLinearHelixRailGeometry(
            nodes,
            [[1, 9], [2, 8], [6, 7]],
            [2, 12],
            2
        );
        expectLinearHelixRailGeometry(
            nodes,
            [[1, 9], [2, 8], [6, 7]],
            [2, 12],
            2,
            'px',
            'py'
        );
        expect(nodes.map(node => [node.num, node.fixed])).toEqual(fixedSnapshot);
        expect(container.varriLinearHelixConstraints.every(constraint =>
            !container.graph.links.includes(constraint)
        )).toBe(true);
        expect(container.linkStrengths).toEqual({ backbone: 10 });
        expect(linearHelixListenerActions(force)).toEqual([
            ['tick.varriLinearHelix', 'set'],
            ['end.varriLinearHelix', 'set'],
        ]);
        expect(typeof handlers['tick.varriLinearHelix']).toBe('function');
        expect(typeof handlers['end.varriLinearHelix']).toBe('function');
        expect(force.start).toHaveBeenCalledTimes(1);
        expect(container.update).not.toHaveBeenCalled();
    });
});
