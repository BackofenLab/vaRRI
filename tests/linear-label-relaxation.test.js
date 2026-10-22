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
test('gently moves only retained wrong-side labels before convergence', () => {
        const v = validateLinearHelixFixture('AAAAA&UUUUU', '((..(&)..))');
        const nucleotideNodes = [
            createLinearHelixTestNode(1, 0, -2, 0),
            createLinearHelixTestNode(10, 0, 2, 0),
            createLinearHelixTestNode(2, 4, -2, 0),
            createLinearHelixTestNode(9, 4, 2, 0),
            createLinearHelixTestNode(5, 16, -2, 0),
            createLinearHelixTestNode(6, 16, 2, 0),
        ];
        const insideLabel = createLinearHelixTestLabel(5, 16, 1);
        const correctSideLabel = createLinearHelixTestLabel(1, 16, 5);
        const hiddenLabel = createLinearHelixTestLabel(2, 4, 1);
        const nodes = [
            ...nucleotideNodes,
            insideLabel,
            correctSideLabel,
            hiddenLabel,
        ];
        const insideLink = {
            source: linearHelixNode(nodes, 5),
            target: insideLabel,
            value: 1,
            linkType: 'label_link',
        };
        const links = [
            insideLink,
            {
                source: linearHelixNode(nodes, 6),
                target: correctSideLabel,
                value: 1,
                linkType: 'label_link',
            },
            {
                source: linearHelixNode(nodes, 2),
                target: hiddenLabel,
                value: 1,
                linkType: 'label_link',
            },
        ];
        const nucleotideSnapshot = linearHelixNucleotideCoordinateSnapshot(nodes);
        const insideBefore = { ...insideLabel };
        const correctBefore = { ...correctSideLabel };
        const hiddenBefore = { ...hiddenLabel };
        const initialInsideScore = linearHelixExteriorScore(
            insideLabel,
            linearHelixNode(nodes, 5),
            linearHelixNode(nodes, 6)
        );
        const { container, handlers } = createLinearHelixTestContainer(nodes, links, 4);

        expect(initialInsideScore).toBeCloseTo(-3, 10);
        expect(vaRRI.applyLinearHelixSprings(container, v, { rri: true }))
            .toBe(2);
        expect(container.graph.links).toBe(links);
        expect(container.graph.links).toHaveLength(3);
        expect(container.varriLinearHelixLabelBiases.map(bias => bias.label))
            .toEqual([insideLabel, correctSideLabel]);
        expect(container.varriLinearHelixLabelBiases.map(bias => ({
            anchor: bias.anchor.num,
            partner: bias.partner.num,
            linkDistance: bias.linkDistance,
        }))).toEqual([
            { anchor: 5, partner: 6, linkDistance: 4 },
            { anchor: 6, partner: 5, linkDistance: 4 },
        ]);

        const scoreAfterApply = linearHelixExteriorScore(
            insideLabel,
            linearHelixNode(nodes, 5),
            linearHelixNode(nodes, 6)
        );
        expect(scoreAfterApply - initialInsideScore).toBeCloseTo(0.2, 10);
        expect(insideLabel.x - insideLabel.px)
            .toBeCloseTo(insideBefore.x - insideBefore.px, 10);
        expect(insideLabel.y - insideLabel.py)
            .toBeCloseTo(insideBefore.y - insideBefore.py, 10);
        expect(correctSideLabel).toEqual(correctBefore);
        expect(hiddenLabel).toEqual(hiddenBefore);
        expectLinearHelixNucleotideCoordinatesUnchanged(nucleotideSnapshot);

        handlers['tick.varriLinearHelix']();
        const scoreAfterTick = linearHelixExteriorScore(
            insideLabel,
            linearHelixNode(nodes, 5),
            linearHelixNode(nodes, 6)
        );
        expect(scoreAfterTick - scoreAfterApply).toBeCloseTo(0.2, 10);
        expect(scoreAfterTick).toBeLessThan(0);

        for (let tick = 0; tick < 40 && linearHelixExteriorScore(
            insideLabel,
            linearHelixNode(nodes, 5),
            linearHelixNode(nodes, 6)
        ) < 0; tick++) {
            handlers['tick.varriLinearHelix']();
        }
        const scoreAfterCrossing = linearHelixExteriorScore(
            insideLabel,
            linearHelixNode(nodes, 5),
            linearHelixNode(nodes, 6)
        );
        expect(scoreAfterCrossing).toBeGreaterThanOrEqual(0);
        expect(scoreAfterCrossing).toBeLessThan(0.4);
        handlers['tick.varriLinearHelix']();
        const scoreAfterMarginTick = linearHelixExteriorScore(
            insideLabel,
            linearHelixNode(nodes, 5),
            linearHelixNode(nodes, 6)
        );
        expect(scoreAfterMarginTick).toBeGreaterThan(scoreAfterCrossing);
        expect(scoreAfterMarginTick - scoreAfterCrossing).toBeLessThanOrEqual(0.2);
        expect(scoreAfterMarginTick).toBeLessThanOrEqual(0.4);
        expect(correctSideLabel).toEqual(correctBefore);
        expect(hiddenLabel).toEqual(hiddenBefore);
        expectLinearHelixNucleotideCoordinatesUnchanged(nucleotideSnapshot);
        expectLinearHelixRailGeometry(
            nodes,
            [[1, 10], [2, 9], [5, 6]],
            [4, 12],
            4
        );
    });

test('keeps hidden labels out but includes a mutation label on a rail', () => {
        const v = validateLinearHelixFixture('AAAAA&UUUUU', '((..(&)..))');
        v.pointMutations = [{ nodeId: 9 }];
        const nucleotideNodes = [
            createLinearHelixTestNode(1, 0, -2, 0),
            createLinearHelixTestNode(10, 0, 2, 0),
            createLinearHelixTestNode(2, 4, -2, 0),
            createLinearHelixTestNode(9, 4, 2, 0),
            createLinearHelixTestNode(5, 16, -2, 0),
            createLinearHelixTestNode(6, 16, 2, 0),
        ];
        const hiddenLabel = createLinearHelixTestLabel(2, 4, 1);
        const mutationLabel = createLinearHelixTestLabel(4, 4, -1);
        const nodes = [...nucleotideNodes, hiddenLabel, mutationLabel];
        const links = [
            {
                source: linearHelixNode(nodes, 2),
                target: hiddenLabel,
                value: 1,
                linkType: 'label_link',
            },
            {
                source: mutationLabel,
                target: linearHelixNode(nodes, 9),
                value: 1,
                linkType: 'label_link',
            },
        ];
        const hiddenBefore = { ...hiddenLabel };
        const mutationScoreBefore = linearHelixExteriorScore(
            mutationLabel,
            linearHelixNode(nodes, 9),
            linearHelixNode(nodes, 2)
        );
        const { container } = createLinearHelixTestContainer(nodes, links, 4);

        expect(vaRRI.applyLinearHelixSprings(container, v, { rri: true }))
            .toBe(2);
        expect(container.varriLinearHelixLabelBiases).toHaveLength(1);
        expect(container.varriLinearHelixLabelBiases[0]).toMatchObject({
            label: mutationLabel,
            anchor: linearHelixNode(nodes, 9),
            partner: linearHelixNode(nodes, 2),
            linkDistance: 4,
        });
        expect(hiddenLabel).toEqual(hiddenBefore);
        expect(linearHelixExteriorScore(
            mutationLabel,
            linearHelixNode(nodes, 9),
            linearHelixNode(nodes, 2)
        ) - mutationScoreBefore).toBeCloseTo(0.2, 10);
        expect(container.graph.links).toBe(links);
    });

test('uses live pair geometry for rotated and reflected rails', () => {
        const v = validateLinearHelixFixture('AAAAA&UUUUU', '((..(&)..))');
        const nucleotideNodes = [
            createLinearHelixTestNode(1, -2, 0, 0),
            createLinearHelixTestNode(10, 2, 0, 0),
            createLinearHelixTestNode(2, -2, 4, 0),
            createLinearHelixTestNode(9, 2, 4, 0),
            createLinearHelixTestNode(5, -2, 16, 0),
            createLinearHelixTestNode(6, 2, 16, 0),
        ];
        nucleotideNodes.forEach(node => {
            node.px = node.x + 0.5;
            node.py = node.y - 0.25;
        });
        const firstRailLabel = createLinearHelixTestLabel(5, 1, 16);
        const secondRailLabel = createLinearHelixTestLabel(1, -1, 16);
        const nodes = [...nucleotideNodes, firstRailLabel, secondRailLabel];
        const links = [
            {
                source: linearHelixNode(nodes, 5),
                target: firstRailLabel,
                value: 1,
                linkType: 'label_link',
            },
            {
                source: linearHelixNode(nodes, 6),
                target: secondRailLabel,
                value: 1,
                linkType: 'label_link',
            },
        ];
        const currentDistances = linearHelixPairwiseDistanceSnapshot(nucleotideNodes);
        const previousDistances = linearHelixPairwiseDistanceSnapshot(
            nucleotideNodes,
            'px',
            'py'
        );
        const firstScoreBefore = linearHelixExteriorScore(
            firstRailLabel,
            linearHelixNode(nodes, 5),
            linearHelixNode(nodes, 6)
        );
        const secondScoreBefore = linearHelixExteriorScore(
            secondRailLabel,
            linearHelixNode(nodes, 6),
            linearHelixNode(nodes, 5)
        );
        const { container } = createLinearHelixTestContainer(nodes, links, 4);

        expect(vaRRI.applyLinearHelixSprings(container, v, { rri: true }))
            .toBe(2);
        expect(container.varriLinearHelixTemplates[0].reflection).toBe(-1);
        expect(linearHelixExteriorScore(
            firstRailLabel,
            linearHelixNode(nodes, 5),
            linearHelixNode(nodes, 6)
        ) - firstScoreBefore).toBeCloseTo(0.2, 10);
        expect(linearHelixExteriorScore(
            secondRailLabel,
            linearHelixNode(nodes, 6),
            linearHelixNode(nodes, 5)
        ) - secondScoreBefore).toBeCloseTo(0.2, 10);
        expectLinearHelixPairwiseDistancesPreserved(
            currentDistances,
            nucleotideNodes
        );
        expectLinearHelixPairwiseDistancesPreserved(
            previousDistances,
            nucleotideNodes,
            'px',
            'py'
        );
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
    });
});
