import { jest } from '@jest/globals';
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
test('cancelActiveRender removes helix end handlers before synchronous force.stop', async () => {
        const v = validateLinearHelixFixture('AAAAA&UUUUU', '((..(&)..))');
        const nodes = [
            createLinearHelixTestNode(1, -4, -3, 0),
            createLinearHelixTestNode(10, -2, 2, 0),
            createLinearHelixTestNode(2, 0, 0, 0),
            createLinearHelixTestNode(9, 10, 0, 0),
            createLinearHelixTestNode(5, 3, 4, 0),
            createLinearHelixTestNode(6, 10, 12, 0),
        ];
        const listeners = {};
        const lifecycle = [];
        const force = {
            on: jest.fn((eventName, handler) => {
                lifecycle.push((handler === null ? 'clear:' : 'set:') + eventName);
                if (handler === null) delete listeners[eventName];
                else listeners[eventName] = handler;
                return force;
            }),
            start: jest.fn(() => {
                lifecycle.push('start');
                return force;
            }),
            stop: jest.fn(() => {
                lifecycle.push('stop');
                const endHandler = listeners['end.varriLinearHelix'];
                if (endHandler) {
                    lifecycle.push('dispatch:end.varriLinearHelix');
                    endHandler();
                }
                return force;
            }),
        };
        const container = {
            graph: { nodes, links: [] },
            options: { linkDistanceMultiplier: 4 },
            linkStrengths: { backbone: 10 },
            force,
            addRNA: jest.fn(),
            centerView: jest.fn(),
            update: jest.fn(),
        };
        const root = { querySelector: () => null, querySelectorAll: () => [] };
        const document = { getElementById: () => root, querySelector: () => root };
        const api = vaRRI.createVaRRI({ document, createCanvas: () => container });

        try {
            const renderPromise = api.render('linear-cancel-test', v, {
                forceLayout: true,
                forceLayoutLinearRRI: true,
            });
            expect(typeof listeners['end.varriLinearHelix']).toBe('function');
            expect(container.varriLinearHelixTemplates).toHaveLength(1);
            expect(container.varriLinearHelixLabelBiases).toEqual([]);

            api.cancelActiveRender();
            await expect(renderPromise).resolves.toEqual({ cancelled: true });

            expect(lifecycle.slice(-3)).toEqual([
                'clear:tick.varriLinearHelix',
                'clear:end.varriLinearHelix',
                'stop',
            ]);
            expect(lifecycle).not.toContain('dispatch:end.varriLinearHelix');
            expect(listeners).toEqual({});
            expect(container.varriLinearHelixConstraints).toBeUndefined();
            expect(container.varriLinearHelixTemplates).toBeUndefined();
            expect(container.varriLinearHelixLabelBiases).toBeUndefined();
            expect(container.centerView).not.toHaveBeenCalled();
            expect(force.stop).toHaveBeenCalledTimes(1);
        } finally {
            api.cancelActiveRender();
        }
    });

test('repeated application replaces old listeners and metadata, then clears them', () => {
        const v = validateLinearHelixFixture('AAAAA&UUUUU', '((..(&)..))');
        const nodes = [
            createLinearHelixTestNode(1, -4, -3, 0),
            createLinearHelixTestNode(10, -2, 2, 0),
            createLinearHelixTestNode(2, 0, 0, 0),
            createLinearHelixTestNode(9, 10, 0, 0),
            createLinearHelixTestNode(5, 3, 4, 0),
            createLinearHelixTestNode(6, 10, 12, 0),
        ];
        const links = [{ linkType: 'backbone' }];
        const { container, force, handlers } = createLinearHelixTestContainer(
            nodes,
            links,
            4
        );

        expect(vaRRI.applyLinearHelixSprings(container, v, { rri: true }))
            .toBe(2);
        const firstConstraints = container.varriLinearHelixConstraints;
        const firstTemplates = container.varriLinearHelixTemplates;
        const firstLabelBiases = container.varriLinearHelixLabelBiases;
        const firstTick = handlers['tick.varriLinearHelix'];
        const firstEnd = handlers['end.varriLinearHelix'];

        expect(vaRRI.applyLinearHelixSprings(container, v, { rri: true }))
            .toBe(2);
        expect(container.varriLinearHelixConstraints).not.toBe(firstConstraints);
        expect(container.varriLinearHelixTemplates).not.toBe(firstTemplates);
        expect(container.varriLinearHelixLabelBiases).not.toBe(firstLabelBiases);
        expect(handlers['tick.varriLinearHelix']).not.toBe(firstTick);
        expect(handlers['end.varriLinearHelix']).not.toBe(firstEnd);
        expect(linearHelixListenerActions(force)).toEqual([
            ['tick.varriLinearHelix', 'set'],
            ['end.varriLinearHelix', 'set'],
            ['tick.varriLinearHelix', 'clear'],
            ['end.varriLinearHelix', 'clear'],
            ['tick.varriLinearHelix', 'set'],
            ['end.varriLinearHelix', 'set'],
        ]);
        expect(force.start).toHaveBeenCalledTimes(2);

        expect(vaRRI.applyLinearHelixSprings(container, v, {})).toBe(0);
        expect(container.varriLinearHelixConstraints).toBeUndefined();
        expect(container.varriLinearHelixTemplates).toBeUndefined();
        expect(container.varriLinearHelixLabelBiases).toBeUndefined();
        expect(handlers).toEqual({});
        expect(linearHelixListenerActions(force).slice(-2)).toEqual([
            ['tick.varriLinearHelix', 'clear'],
            ['end.varriLinearHelix', 'clear'],
        ]);
        expect(force.start).toHaveBeenCalledTimes(2);
        expect(container.graph.links).toBe(links);
    });
});
