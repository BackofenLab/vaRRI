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
test('skips fixed, invalid, and unpaired labels without blocking valid ones', () => {
        const v = validateLinearHelixFixture('AAAAA&UUUUU', '((..(&)..))');
        v.pointMutations = [{ nodeId: 99 }];
        const nucleotideNodes = [
            createLinearHelixTestNode(1, 0, -2, 0),
            createLinearHelixTestNode(10, 0, 2, 0),
            createLinearHelixTestNode(2, 4, -2, 0),
            createLinearHelixTestNode(9, 4, 2, 0),
            createLinearHelixTestNode(5, 16, -2, 0),
            createLinearHelixTestNode(6, 16, 2, 0),
            createLinearHelixTestNode(96, 80, 80, 0),
        ];
        const validLabel = createLinearHelixTestLabel(1, 0, 1);
        const fixedLabel = createLinearHelixTestLabel(5, 16, 1, 2);
        const invalidLabel = createLinearHelixTestLabel(1, 16, -1);
        invalidLabel.py = Infinity;
        const unpairedLabel = createLinearHelixTestLabel(99, 79, 80);
        const nodes = [
            ...nucleotideNodes,
            validLabel,
            fixedLabel,
            invalidLabel,
            unpairedLabel,
        ];
        const links = [
            [linearHelixNode(nodes, 1), validLabel],
            [linearHelixNode(nodes, 5), fixedLabel],
            [linearHelixNode(nodes, 6), invalidLabel],
            [linearHelixNode(nodes, 96), unpairedLabel],
        ].map(([source, target]) => ({
            source,
            target,
            value: 1,
            linkType: 'label_link',
        }));
        const validScoreBefore = linearHelixExteriorScore(
            validLabel,
            linearHelixNode(nodes, 1),
            linearHelixNode(nodes, 10)
        );
        const fixedBefore = { ...fixedLabel };
        const invalidBefore = { ...invalidLabel };
        const unpairedBefore = { ...unpairedLabel };
        const { container, handlers } = createLinearHelixTestContainer(nodes, links, 4);

        expect(vaRRI.applyLinearHelixSprings(container, v, { rri: true }))
            .toBe(2);
        expect(container.varriLinearHelixLabelBiases.map(bias => bias.label))
            .toEqual([validLabel, fixedLabel, invalidLabel]);
        expect(linearHelixExteriorScore(
            validLabel,
            linearHelixNode(nodes, 1),
            linearHelixNode(nodes, 10)
        ) - validScoreBefore).toBeCloseTo(0.2, 10);
        expect(fixedLabel).toEqual(fixedBefore);
        expect(invalidLabel).toEqual(invalidBefore);
        expect(unpairedLabel).toEqual(unpairedBefore);

        handlers['tick.varriLinearHelix']();
        expect(fixedLabel).toEqual(fixedBefore);
        expect(invalidLabel).toEqual(invalidBefore);
        expect(unpairedLabel).toEqual(unpairedBefore);
        expect(nucleotideNodes.every(node =>
            [node.x, node.y, node.px, node.py].every(Number.isFinite)
        )).toBe(true);
    });

test('end remains capped, guides the centreline outward, and synchronizes label DOM', () => {
        const v = validateLinearHelixFixture('AAAAA&UUUUU', '((..(&)..))');
        const nucleotideNodes = [
            createLinearHelixTestNode(1, 0, -2, 0),
            createLinearHelixTestNode(10, 0, 2, 0),
            createLinearHelixTestNode(2, 4, -2, 0),
            createLinearHelixTestNode(9, 4, 2, 0),
            createLinearHelixTestNode(5, 16, -2, 0),
            createLinearHelixTestNode(6, 16, 2, 0),
        ];
        const label = createLinearHelixTestLabel(5, 16, 1);
        const nodes = [...nucleotideNodes, label];
        const labelLink = {
            source: linearHelixNode(nodes, 5),
            target: label,
            value: 1.5,
            linkType: 'label_link',
        };
        const groupAttributes = {};
        const lineAttributes = {};
        const labelGroup = {
            __data__: label,
            setAttribute: jest.fn((name, value) => {
                groupAttributes[name] = value;
            }),
        };
        const labelLine = {
            __data__: labelLink,
            setAttribute: jest.fn((name, value) => {
                lineAttributes[name] = value;
            }),
        };
        const hadDocument = Object.prototype.hasOwnProperty.call(global, 'document');
        const previousDocument = global.document;
        global.document = {
            querySelectorAll: jest.fn(selector => {
                if (selector === 'g.gnode') return [labelGroup];
                if (selector === 'line.link') return [labelLine];
                return [];
            }),
        };

        try {
            const { container, handlers } = createLinearHelixTestContainer(
                nodes,
                [labelLink],
                4
            );
            expect(vaRRI.applyLinearHelixSprings(container, v, { rri: true }))
                .toBe(2);
            expect(container.varriLinearHelixLabelBiases[0].linkDistance).toBe(6);

            const anchor = linearHelixNode(nodes, 5);
            const partner = linearHelixNode(nodes, 6);
            const outward = linearHelixVector(partner, anchor);
            const outwardLength = linearHelixVectorLength(outward);
            const unit = {
                x: outward.x / outwardLength,
                y: outward.y / outwardLength,
            };
            label.x = anchor.x - 2 * unit.x;
            label.y = anchor.y - 2 * unit.y;
            label.px = label.x - 0.75;
            label.py = label.y + 0.25;
            const velocityBefore = [label.x - label.px, label.y - label.py];
            const insideScoreBeforeEnd = linearHelixExteriorScore(label, anchor, partner);

            handlers['end.varriLinearHelix']();
            const insideScoreAfterEnd = linearHelixExteriorScore(label, anchor, partner);
            expect(insideScoreBeforeEnd).toBeCloseTo(-2, 10);
            expect(insideScoreAfterEnd - insideScoreBeforeEnd).toBeCloseTo(0.3, 10);
            expect(insideScoreAfterEnd).toBeLessThan(0);
            expect(label.x - label.px).toBeCloseTo(velocityBefore[0], 10);
            expect(label.y - label.py).toBeCloseTo(velocityBefore[1], 10);

            label.x = anchor.x;
            label.y = anchor.y;
            label.px = label.x - 0.75;
            label.py = label.y + 0.25;
            const centrelineBefore = [label.x, label.y, label.px, label.py];
            handlers['end.varriLinearHelix']();
            const centrelineScoreAfterEnd = linearHelixExteriorScore(
                label,
                anchor,
                partner
            );
            expect(centrelineScoreAfterEnd).toBeCloseTo(0.12, 10);
            expect(centrelineScoreAfterEnd).toBeGreaterThan(0);
            expect(Math.hypot(
                label.x - centrelineBefore[0],
                label.y - centrelineBefore[1]
            )).toBeCloseTo(0.12, 10);
            expect(Math.hypot(
                label.px - centrelineBefore[2],
                label.py - centrelineBefore[3]
            )).toBeCloseTo(0.12, 10);
            expect(groupAttributes.transform)
                .toBe(`translate(${label.x},${label.y})`);
            expect(lineAttributes).toEqual({
                x1: String(anchor.x),
                y1: String(anchor.y),
                x2: String(label.x),
                y2: String(label.y),
            });
            expect(container.centerView).toHaveBeenCalledTimes(1);
        } finally {
            if (hadDocument) global.document = previousDocument;
            else delete global.document;
        }
    });

test('refits the viewport only on the first end while later ends still enforce', () => {
        const v = validateLinearHelixFixture('AAAAA&UUUUU', '((..(&)..))');
        const nodes = [
            createLinearHelixTestNode(1, -4, -3, 0),
            createLinearHelixTestNode(10, -2, 2, 0),
            createLinearHelixTestNode(2, 0, 0, 0),
            createLinearHelixTestNode(9, 10, 0, 0),
            createLinearHelixTestNode(5, 3, 4, 0),
            createLinearHelixTestNode(6, 10, 12, 0),
        ];
        const { container, handlers } = createLinearHelixTestContainer(
            nodes,
            [],
            4
        );

        expect(vaRRI.applyLinearHelixSprings(container, v, { rri: true }))
            .toBe(2);
        expect(container.centerView).not.toHaveBeenCalled();

        handlers['end.varriLinearHelix']();
        expect(container.centerView).toHaveBeenCalledTimes(1);

        linearHelixNode(nodes, 1).x += 19;
        linearHelixNode(nodes, 9).y -= 7;
        linearHelixNode(nodes, 10).px -= 11;
        handlers['tick.varriLinearHelix']();
        expect(container.centerView).toHaveBeenCalledTimes(1);
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

        linearHelixNode(nodes, 5).y += 13;
        linearHelixNode(nodes, 6).px -= 9;
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
        expect(container.centerView).toHaveBeenCalledTimes(1);
    });
});
