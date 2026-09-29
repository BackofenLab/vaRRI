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
test.each([
        {
            name: 'single-pair interaction',
            sequence: 'AAAA&UUUU',
            structure: '(...&...)',
            nodeNumbers: [1, 8],
        },
        {
            name: 'crossing interaction',
            sequence: 'AAAA&UUUUUUUUU',
            structure: '([.{&...}...)]',
            nodeNumbers: [1, 12, 2, 13, 4, 8],
        },
    ])('leaves a $name unchanged because no unique RRI axis exists', ({
        sequence,
        structure,
        nodeNumbers,
    }) => {
        const v = validateLinearHelixFixture(sequence, structure);
        const nodes = nodeNumbers.map((num, index) =>
            createLinearHelixTestNode(num, 3 * index, 5 - 2 * index, 0)
        );
        const snapshot = nodes.map(node => ({ ...node }));
        const links = [{
            source: nodes[0],
            target: nodes[1],
            linkType: 'basepair',
        }];
        const { container, force, handlers } = createLinearHelixTestContainer(
            nodes,
            links,
            4
        );

        expect(vaRRI.applyLinearHelixSprings(container, v, { rri: true }))
            .toBe(0);
        expect(container.graph.links).toBe(links);
        expect(container.varriLinearHelixConstraints).toBeUndefined();
        expect(container.varriLinearHelixTemplates).toBeUndefined();
        expect(container.varriLinearHelixLabelBiases).toBeUndefined();
        expect(nodes).toEqual(snapshot);
        expect(handlers).toEqual({});
        expect(force.on).not.toHaveBeenCalled();
        expect(force.start).not.toHaveBeenCalled();
    });

test.each([
        ['permanently pinned', 1],
        ['drag-active', 2],
        ['hover-active', 4],
    ])('skips a helix with a %s endpoint (fixed=%i)', (_state, fixed) => {
        const v = validateLinearHelixFixture('AAAAA&UU', '(...(&))');
        const nodes = [
            createLinearHelixTestNode(1, 0, 0, 0),
            createLinearHelixTestNode(5, 3, 4, fixed),
            createLinearHelixTestNode(6, 10, 0, 0),
            createLinearHelixTestNode(7, 10, 12, 0),
        ];
        const snapshot = nodes.map(node => ({ ...node }));
        const links = [{ linkType: 'backbone' }];
        const { container, force, handlers } = createLinearHelixTestContainer(
            nodes,
            links
        );

        expect(vaRRI.applyLinearHelixSprings(container, v, { rri: true }))
            .toBe(0);
        expect(container.graph.links).toBe(links);
        expect(container.varriLinearHelixConstraints).toBeUndefined();
        expect(container.varriLinearHelixTemplates).toBeUndefined();
        expect(nodes).toEqual(snapshot);
        expect(handlers).toEqual({});
        expect(force.on).not.toHaveBeenCalled();
        expect(force.start).not.toHaveBeenCalled();
    });

test('keeps the graph orientation when an unrelated node is pinned', () => {
        const v = validateLinearHelixFixture('AAAAA&UUUUU', '((..(&)..))');
        const nodes = [
            createLinearHelixTestNode(1, -2, 0, 0),
            createLinearHelixTestNode(10, 2, 0, 0),
            createLinearHelixTestNode(2, -2, 4, 0),
            createLinearHelixTestNode(9, 2, 4, 0),
            createLinearHelixTestNode(5, -2, 16, 0),
            createLinearHelixTestNode(6, 2, 16, 0),
            createLinearHelixTestNode(99, 40, -30, 1),
        ];
        const coordinateSnapshot = linearHelixCoordinateSnapshot(nodes);
        const { container, force, handlers } = createLinearHelixTestContainer(
            nodes,
            [],
            4
        );

        expect(vaRRI.applyLinearHelixSprings(container, v, { rri: true }))
            .toBe(2);
        expect(container.varriLinearHelixTemplates).toHaveLength(1);
        expect(container.varriLinearHelixTemplates[0].lastHorizontalRotation)
            .toBeUndefined();
        const centers = linearHelixPairCenters(
            nodes,
            [[1, 10], [2, 9], [5, 6]]
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

test('horizontalizes a rotated pure RRI stack with one rigid graph-wide transform', () => {
        const v = validateLinearHelixFixture('AAA&UUU', '(((&)))');
        const exteriorLabel = createLinearHelixTestLabel(3, 0, 0);
        const pointEntries = [
            [createLinearHelixTestNode(1, 0, 0, 0), { x: 0, y: -2 }],
            [createLinearHelixTestNode(6, 0, 0, 0), { x: 0, y: 2 }],
            [createLinearHelixTestNode(2, 0, 0, 0), { x: 4, y: -2 }],
            [createLinearHelixTestNode(5, 0, 0, 0), { x: 4, y: 2 }],
            [createLinearHelixTestNode(3, 0, 0, 0), { x: 8, y: -2 }],
            [createLinearHelixTestNode(4, 0, 0, 0), { x: 8, y: 2 }],
            [createLinearHelixTestNode(99, 0, 0, 0), { x: 13, y: 7 }],
            [exteriorLabel, { x: 8, y: -6 }],
        ];
        const nodes = pointEntries.map(([node]) => node);
        const currentAngle = 2 * Math.PI / 3;
        const previousAngle = 5 * Math.PI / 9;
        pointEntries.forEach(([node, point]) => {
            const current = linearHelixTransformPoint(
                point,
                currentAngle,
                { x: 30, y: -10 }
            );
            const previous = linearHelixTransformPoint(
                point,
                previousAngle,
                { x: -12, y: 25 }
            );
            node.x = current.x;
            node.y = current.y;
            node.px = previous.x;
            node.py = previous.y;
        });
        const basepairLink = {
            source: linearHelixNode(nodes, 1),
            target: linearHelixNode(nodes, 6),
            linkType: 'basepair',
        };
        const labelLink = {
            source: linearHelixNode(nodes, 3),
            target: exteriorLabel,
            value: 1,
            linkType: 'label_link',
        };
        const links = [basepairLink, labelLink];
        const currentDistances = linearHelixPairwiseDistanceSnapshot(nodes);
        const previousDistances = linearHelixPairwiseDistanceSnapshot(nodes, 'px', 'py');
        const exteriorScoreBefore = linearHelixExteriorScore(
            exteriorLabel,
            linearHelixNode(nodes, 3),
            linearHelixNode(nodes, 4)
        );
        const nodeElements = nodes.map(node => ({
            __data__: node,
            attributes: {},
            setAttribute: jest.fn(function setAttribute(name, value) {
                this.attributes[name] = value;
            }),
        }));
        const linkElements = links.map(link => ({
            __data__: link,
            attributes: {},
            setAttribute: jest.fn(function setAttribute(name, value) {
                this.attributes[name] = value;
            }),
        }));
        const hadDocument = Object.prototype.hasOwnProperty.call(global, 'document');
        const previousDocument = global.document;
        global.document = {
            querySelectorAll: jest.fn(selector => {
                if (selector === 'g.gnode') return nodeElements;
                if (selector === 'line.link') return linkElements;
                return [];
            }),
        };

        try {
            const { container, force, handlers } = createLinearHelixTestContainer(
                nodes,
                links,
                4
            );

            expect(vaRRI.applyLinearHelixSprings(container, v, { rri: true }))
                .toBe(0);
            expect(container.graph.links).toBe(links);
            expect(container.varriLinearHelixConstraints).toEqual([]);
            expect(container.varriLinearHelixTemplates).toHaveLength(1);
            expect(container.varriLinearHelixTemplates[0]).toMatchObject({
                kind: 'rri',
                pairs: [[1, 6], [2, 5], [3, 4]],
                horizontalDirection: -1,
            });
            expect(container.varriLinearHelixTemplates[0].lastHorizontalRotation)
                .toBeCloseTo(Math.PI / 3, 10);
            expect(container.varriLinearHelixLabelBiases.map(bias => bias.label))
                .toEqual([exteriorLabel]);
            expectLinearHelixHorizontalAxis(
                nodes,
                [[1, 6], [2, 5], [3, 4]],
                'x',
                'y',
                -1
            );
            expectLinearHelixHorizontalAxis(
                nodes,
                [[1, 6], [2, 5], [3, 4]],
                'px',
                'py',
                -1
            );
            expectLinearHelixRailGeometry(
                nodes,
                [[1, 6], [2, 5], [3, 4]],
                [4, 4],
                4
            );
            expectLinearHelixRailGeometry(
                nodes,
                [[1, 6], [2, 5], [3, 4]],
                [4, 4],
                4,
                'px',
                'py'
            );
            expectLinearHelixPairwiseDistancesPreserved(currentDistances, nodes);
            expectLinearHelixPairwiseDistancesPreserved(
                previousDistances,
                nodes,
                'px',
                'py'
            );
            expect(linearHelixExteriorScore(
                exteriorLabel,
                linearHelixNode(nodes, 3),
                linearHelixNode(nodes, 4)
            )).toBeCloseTo(exteriorScoreBefore, 10);

            nodeElements.forEach(element => {
                expect(element.attributes.transform)
                    .toBe(`translate(${element.__data__.x},${element.__data__.y})`);
            });
            linkElements.forEach(element => {
                expect(element.attributes).toEqual({
                    x1: String(element.__data__.source.x),
                    y1: String(element.__data__.source.y),
                    x2: String(element.__data__.target.x),
                    y2: String(element.__data__.target.y),
                });
            });
            expect(linearHelixListenerActions(force)).toEqual([
                ['tick.varriLinearHelix', 'set'],
                ['end.varriLinearHelix', 'set'],
            ]);
            expect(force.start).toHaveBeenCalledTimes(1);

            const horizontalSnapshot = linearHelixCoordinateSnapshot(nodes);
            handlers['tick.varriLinearHelix']();
            expectLinearHelixCoordinatesClose(horizontalSnapshot);
            expect(container.varriLinearHelixTemplates[0].lastHorizontalRotation)
                .toBeCloseTo(0, 10);
            handlers['end.varriLinearHelix']();
            handlers['end.varriLinearHelix']();
            expectLinearHelixCoordinatesClose(horizontalSnapshot);
            expect(container.centerView).toHaveBeenCalledTimes(1);
        } finally {
            if (hadDocument) global.document = previousDocument;
            else delete global.document;
        }
    });
});
