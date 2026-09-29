import vaRRI from '../../src/vaRRI.js';

export function validateLinearHelixFixture(sequence, structure, overrides = {}) {
    return vaRRI.validate({
        sequence,
        structure,
        startIndex1: '1',
        startIndex2: '1',
        ...overrides,
    });
}

export function constraintEndpoints(specs) {
    return specs.map(spec => [spec.source, spec.target, spec.sequence]);
}

export function createLinearHelixTestNode(num, x, y, fixed) {
    return {
        nodeType: 'nucleotide',
        num,
        x,
        y,
        px: x - 0.25,
        py: y + 0.5,
        fixed,
    };
}

export function createLinearHelixTestLabel(name, x, y, fixed = 0) {
    return {
        nodeType: 'label',
        num: -1,
        name: String(name),
        radius: 6,
        x,
        y,
        px: x - 0.75,
        py: y + 0.25,
        fixed,
    };
}

export function createLinearHelixTestContainer(nodes, links = [], multiplier = 4) {
    const handlers = {};
    const force = {
        on: jest.fn((eventName, handler) => {
            if (handler === null) delete handlers[eventName];
            else handlers[eventName] = handler;
            return force;
        }),
        start: jest.fn(),
    };
    return {
        container: {
            graph: { nodes, links },
            options: { linkDistanceMultiplier: multiplier },
            linkStrengths: { backbone: 10 },
            force,
            centerView: jest.fn(),
            update: jest.fn(),
        },
        force,
        handlers,
    };
}

export function linearHelixConstraintSummary(constraints = []) {
    return constraints.map(constraint => ({
        endpoints: [constraint.source.num, constraint.target.num],
        kind: constraint.varriLinearHelixKind,
        loop: constraint.varriLinearHelixLoop,
        type: constraint.linkType,
        target: constraint.varriTargetDistance,
        value: constraint.value,
    }));
}

export function linearHelixNode(nodes, num) {
    return nodes.find(node => node.num === num);
}

export function linearHelixVector(first, second, xField = 'x', yField = 'y') {
    return {
        x: second[xField] - first[xField],
        y: second[yField] - first[yField],
    };
}

export function linearHelixVectorLength(vector) {
    return Math.hypot(vector.x, vector.y);
}

export function linearHelixDot(first, second) {
    return first.x * second.x + first.y * second.y;
}

export function linearHelixCross(first, second) {
    return first.x * second.y - first.y * second.x;
}

export function linearHelixExteriorScore(label, anchor, partner) {
    const outward = linearHelixVector(partner, anchor);
    const length = linearHelixVectorLength(outward);
    return linearHelixDot(
        linearHelixVector(anchor, label),
        { x: outward.x / length, y: outward.y / length }
    );
}

export function linearHelixNucleotideCoordinateSnapshot(nodes) {
    return nodes
        .filter(node => node.nodeType === 'nucleotide')
        .map(node => ({
            node,
            coordinates: [node.x, node.y, node.px, node.py],
        }));
}

export function expectLinearHelixNucleotideCoordinatesUnchanged(snapshot) {
    snapshot.forEach(({ node, coordinates }) => {
        [node.x, node.y, node.px, node.py].forEach((value, index) => {
            expect(value).toBeCloseTo(coordinates[index], 10);
        });
    });
}

export function linearHelixCoordinateSnapshot(nodes) {
    return nodes.map(node => ({
        node,
        coordinates: [node.x, node.y, node.px, node.py],
    }));
}

export function expectLinearHelixCoordinatesClose(snapshot, precision = 10) {
    snapshot.forEach(({ node, coordinates }) => {
        [node.x, node.y, node.px, node.py].forEach((value, index) => {
            expect(value).toBeCloseTo(coordinates[index], precision);
        });
    });
}

export function linearHelixPairwiseDistanceSnapshot(nodes, xField = 'x', yField = 'y') {
    const distances = [];
    nodes.forEach((first, firstIndex) => {
        nodes.slice(firstIndex + 1).forEach(second => {
            distances.push(linearHelixVectorLength(
                linearHelixVector(first, second, xField, yField)
            ));
        });
    });
    return distances;
}

export function expectLinearHelixPairwiseDistancesPreserved(
    snapshot,
    nodes,
    xField = 'x',
    yField = 'y',
    precision = 10
) {
    const current = linearHelixPairwiseDistanceSnapshot(nodes, xField, yField);
    expect(current).toHaveLength(snapshot.length);
    current.forEach((distance, index) => {
        expect(distance).toBeCloseTo(snapshot[index], precision);
    });
}

export function linearHelixPairCenters(nodes, pairs, xField = 'x', yField = 'y') {
    return pairs.map(pair => {
        const first = linearHelixNode(nodes, pair[0]);
        const second = linearHelixNode(nodes, pair[1]);
        return {
            x: (first[xField] + second[xField]) / 2,
            y: (first[yField] + second[yField]) / 2,
        };
    });
}

export function expectLinearHelixHorizontalAxis(
    nodes,
    pairs,
    xField = 'x',
    yField = 'y',
    direction = null
) {
    const centers = linearHelixPairCenters(nodes, pairs, xField, yField);
    const yValues = centers.map(center => center.y);
    expect(Math.max(...yValues) - Math.min(...yValues)).toBeCloseTo(0, 10);
    const xDelta = centers.at(-1).x - centers[0].x;
    expect(Math.abs(xDelta)).toBeGreaterThan(1e-8);
    if (direction !== null) expect(Math.sign(xDelta)).toBe(direction);
    return { centers, xDelta };
}

export function linearHelixTransformPoint(point, radians, translation) {
    const cosine = Math.cos(radians);
    const sine = Math.sin(radians);
    return {
        x: translation.x + cosine * point.x - sine * point.y,
        y: translation.y + sine * point.x + cosine * point.y,
    };
}

export function linearHelixListenerActions(force) {
    return force.on.mock.calls.map(([eventName, handler]) => [
        eventName,
        handler === null ? 'clear' : 'set',
    ]);
}

export function expectLinearHelixRailGeometry(
    nodes,
    pairs,
    intervals,
    rungSpacing,
    xField = 'x',
    yField = 'y'
) {
    const firstRail = pairs.map(pair => linearHelixNode(nodes, pair[0]));
    const secondRail = pairs.map(pair => linearHelixNode(nodes, pair[1]));
    const firstSteps = firstRail.slice(1).map((node, index) =>
        linearHelixVector(firstRail[index], node, xField, yField)
    );
    const secondSteps = secondRail.slice(1).map((node, index) =>
        linearHelixVector(secondRail[index], node, xField, yField)
    );
    const rungs = firstRail.map((node, index) =>
        linearHelixVector(node, secondRail[index], xField, yField)
    );

    firstSteps.forEach((step, index) => {
        expect(linearHelixVectorLength(step)).toBeCloseTo(intervals[index], 10);
        expect(linearHelixVectorLength(secondSteps[index]))
            .toBeCloseTo(intervals[index], 10);
        expect(linearHelixCross(step, secondSteps[index])).toBeCloseTo(0, 10);
        expect(linearHelixDot(step, secondSteps[index])).toBeGreaterThan(0);
    });

    const axis = firstSteps[0];
    [...firstSteps, ...secondSteps].forEach(step => {
        expect(linearHelixCross(axis, step)).toBeCloseTo(0, 10);
        expect(linearHelixDot(axis, step)).toBeGreaterThan(0);
    });
    rungs.forEach(rung => {
        expect(linearHelixVectorLength(rung)).toBeCloseTo(rungSpacing, 10);
        expect(linearHelixCross(rungs[0], rung)).toBeCloseTo(0, 10);
        expect(linearHelixDot(rungs[0], rung)).toBeGreaterThan(0);
        expect(linearHelixDot(axis, rung)).toBeCloseTo(0, 10);
    });
}
