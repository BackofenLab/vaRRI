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
test('stores max-span metadata outside graph links and enforces a rigid RRI ladder', () => {
        const v = validateLinearHelixFixture('AAAAA&UUUUU', '((..(&)..))');
        const nodes = [
            createLinearHelixTestNode(1, -4, -3, 0),
            createLinearHelixTestNode(10, -2, 2, 0),
            createLinearHelixTestNode(2, 0, 0, 0),
            createLinearHelixTestNode(9, 10, 0, 0),
            createLinearHelixTestNode(5, 3, 4, 0),
            createLinearHelixTestNode(6, 10, 12, 0),
        ];
        const fixedSnapshot = nodes.map(node => [node.num, node.fixed]);
        const existing = {
            source: nodes[0],
            target: nodes[2],
            linkType: 'backbone',
            marker: 'preserve-me',
        };
        const links = [existing];
        const { container, force, handlers } = createLinearHelixTestContainer(
            nodes,
            links,
            4
        );

        expect(vaRRI.applyLinearHelixSprings(container, v, { rri: true }))
            .toBe(2);
        expect(container.graph.links).toBe(links);
        expect(container.graph.links).toEqual([existing]);
        expect(linearHelixConstraintSummary(container.varriLinearHelixConstraints))
            .toEqual([
                {
                    endpoints: [2, 5],
                    kind: 'rri',
                    loop: 'rri:0',
                    type: 'rri_linear',
                    target: 12,
                    value: 3,
                },
                {
                    endpoints: [6, 9],
                    kind: 'rri',
                    loop: 'rri:0',
                    type: 'rri_linear',
                    target: 12,
                    value: 3,
                },
            ]);
        container.varriLinearHelixConstraints.forEach(constraint => {
            expect(constraint).toMatchObject({
                extraLinkType: 'constraint',
                varriLinearHelix: true,
            });
            expect(container.graph.links).not.toContain(constraint);
        });
        expect(container.varriLinearHelixTemplates).toHaveLength(1);
        expect(container.varriLinearHelixTemplates[0]).toMatchObject({
            kind: 'rri',
            pairs: [[1, 10], [2, 9], [5, 6]],
            intervals: [
                { span: 4, isLoop: false, gaps: [0, 0] },
                { span: 12, isLoop: true, gaps: [2, 2] },
            ],
            railGap: 4,
        });
        expectLinearHelixRailGeometry(
            nodes,
            [[1, 10], [2, 9], [5, 6]],
            [4, 12],
            4
        );
        expect(nodes.map(node => [node.num, node.fixed])).toEqual(fixedSnapshot);
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
            [[1, 10], [2, 9], [5, 6]]
        );
        expectLinearHelixHorizontalAxis(
            nodes,
            [[1, 10], [2, 9], [5, 6]],
            'px',
            'py'
        );
        nodes.forEach(node => {
            expect(node.px - node.x).toBeCloseTo(-0.25, 10);
            expect(node.py - node.y).toBeCloseTo(0.5, 10);
            expect(node.varriLinearHelix).toBe(true);
            expect(node.varriLinearHelixKind).toBe('rri');
        });

        linearHelixNode(nodes, 1).x += 17;
        linearHelixNode(nodes, 2).y -= 9;
        linearHelixNode(nodes, 6).x -= 5;
        linearHelixNode(nodes, 10).px -= 8;
        linearHelixNode(nodes, 5).py += 6;
        linearHelixNode(nodes, 9).px += 3;
        expect(linearHelixVectorLength(linearHelixVector(
            linearHelixNode(nodes, 1),
            linearHelixNode(nodes, 2)
        ))).not.toBeCloseTo(4, 5);
        handlers['tick.varriLinearHelix']();
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
            [[1, 10], [2, 9], [5, 6]]
        );
        expectLinearHelixHorizontalAxis(
            nodes,
            [[1, 10], [2, 9], [5, 6]],
            'px',
            'py'
        );
        expect(container.centerView).not.toHaveBeenCalled();

        linearHelixNode(nodes, 10).y += 11;
        linearHelixNode(nodes, 5).x -= 8;
        linearHelixNode(nodes, 1).py -= 13;
        linearHelixNode(nodes, 6).px += 7;
        handlers['end.varriLinearHelix']();
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
            [[1, 10], [2, 9], [5, 6]]
        );
        expectLinearHelixHorizontalAxis(
            nodes,
            [[1, 10], [2, 9], [5, 6]],
            'px',
            'py'
        );
        expect(container.centerView).toHaveBeenCalledTimes(1);
        expect(nodes.map(node => [node.num, node.fixed])).toEqual(fixedSnapshot);
        expect(linearHelixListenerActions(force)).toEqual([
            ['tick.varriLinearHelix', 'set'],
            ['end.varriLinearHelix', 'set'],
        ]);
        expect(force.start).toHaveBeenCalledTimes(1);
        expect(container.linkStrengths).toEqual({ backbone: 10 });
        expect(container.update).not.toHaveBeenCalled();
    });

test('skips the whole helix when one pair coordinate is invalid', () => {
        const v = validateLinearHelixFixture('AAAAA&UU', '(...(&))');
        const nodes = [
            createLinearHelixTestNode(1, 0, 0, 0),
            createLinearHelixTestNode(5, 3, 4, 0),
            createLinearHelixTestNode(6, 10, 0, 0),
            createLinearHelixTestNode(7, 10, Infinity, 0),
        ];
        const snapshot = nodes.map(node => ({ ...node }));
        const existing = { linkType: 'backbone' };
        const links = [existing];
        const { container, force, handlers } = createLinearHelixTestContainer(
            nodes,
            links
        );

        expect(vaRRI.applyLinearHelixSprings(container, v, { rri: true }))
            .toBe(0);
        expect(container.graph.links).toBe(links);
        expect(container.graph.links).toEqual([existing]);
        expect(container.varriLinearHelixConstraints).toBeUndefined();
        expect(container.varriLinearHelixTemplates).toBeUndefined();
        expect(container.varriLinearHelixLabelBiases).toBeUndefined();
        expect(container.linkStrengths).toEqual({ backbone: 10 });
        expect(nodes).toEqual(snapshot);
        expect(handlers).toEqual({});
        expect(linearHelixListenerActions(force)).toEqual([]);
        expect(force.start).not.toHaveBeenCalled();
        expect(container.update).not.toHaveBeenCalled();
    });

test('preserves reflected rail handedness instead of mirroring the helix', () => {
        const v = validateLinearHelixFixture('AAAAA&UUUUU', '((..(&)..))');
        const nodes = [
            createLinearHelixTestNode(1, 0, 2, 0),
            createLinearHelixTestNode(10, 0, -2, 0),
            createLinearHelixTestNode(2, 4, 2, 0),
            createLinearHelixTestNode(9, 4, -2, 0),
            createLinearHelixTestNode(5, 16, 2, 0),
            createLinearHelixTestNode(6, 16, -2, 0),
        ];
        const links = [{ linkType: 'backbone' }];
        const { container } = createLinearHelixTestContainer(nodes, links, 4);
        const handednessBefore = linearHelixCross(
            linearHelixVector(
                linearHelixNode(nodes, 1),
                linearHelixNode(nodes, 2)
            ),
            linearHelixVector(
                linearHelixNode(nodes, 1),
                linearHelixNode(nodes, 10)
            )
        );

        expect(handednessBefore).toBeLessThan(0);
        expect(vaRRI.applyLinearHelixSprings(container, v, { rri: true }))
            .toBe(2);
        expect(container.graph.links).toBe(links);
        expect(container.varriLinearHelixTemplates).toHaveLength(1);
        expect(container.varriLinearHelixTemplates[0].reflection).toBe(-1);
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
        expect(linearHelixCross(
            linearHelixVector(
                linearHelixNode(nodes, 1),
                linearHelixNode(nodes, 2)
            ),
            linearHelixVector(
                linearHelixNode(nodes, 1),
                linearHelixNode(nodes, 10)
            )
        )).toBeLessThan(0);
    });
});
