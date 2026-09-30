import { createVaRRI } from '../src/vaRRI.js';
import { createNavigationActions } from '../src/ui/navigation-actions.js';
import { normalizeRegionInput } from '../src/ui/controllers/regions.js';

function createNavigationFixture(options = {}) {
    const api = Object.assign(createVaRRI(), options.vaRRIOverrides || {});
    const fields = Object.fromEntries((options.formElements || []).map(field => [field.id, field.value]));
    const state = { fields, rotation: 0 };
    const document = {
        defaultView: { location: { href: 'https://example.test/index.html' }, console },
        body: { classList: { toggle() {} } },
        getElementById: () => null,
    };
    const actions = {
        getSequenceContext: () => ({ '1': { offset: 1, length: 4 }, '2': { offset: 1, length: 4 } }),
        syncAnnotations() {}, enableForceLayoutForSelectedLinearOptions() {}, syncAnimationDependentControls() {},
    };
    return createNavigationActions({ api, state, defaults: {}, initialColors: api.getColors(), actions, document, examples: {} });
}

describe('region input helpers', () => {
    test('normalizes region range strings by removing whitespace', () => {
        expect(normalizeRegionInput(' 2 - 4 ')).toBe('2-4');
        expect(normalizeRegionInput('')).toBe('');
    });
});

describe('region highlight URL helpers', () => {
    test('serializes and loads region highlights through the browser script helpers', () => {
        const registeredRegionHighlights = [];
        const stubbedRegionHighlights = [{
            id: 1,
            sequence1Range: [2, 4],
            sequence2Range: [5, 7],
            color: '#123456',
            rangeText: '2-4&5-7',
            generated: false,
        }];
        const sandbox = createNavigationFixture({
            vaRRIOverrides: {
                getPointMutations: () => [],
                getSubsequenceHighlights: () => [],
                getRegionHighlights: () => stubbedRegionHighlights,
                registerRegionHighlight: input => {
                    registeredRegionHighlights.push(input);
                    return { id: 1, ...input };
                },
                validate: () => ({ offset1: 1, offset2: 1, sequence1: 'ACGU', sequence2: 'ACGU' }),
            },
        });

        const shareUrlText = sandbox.generateShareableURL();
        expect(shareUrlText).toContain('regionHighlights=');

        const shareUrl = new URL(shareUrlText);
        sandbox.loadAllUrlParameters(shareUrl.searchParams);

        expect(registeredRegionHighlights).toHaveLength(1);
        expect(registeredRegionHighlights[0]).toMatchObject({
            sequence1Range: [2, 4],
            sequence2Range: [5, 7],
            color: '#123456',
        });
    });

    test('does not serialize generated region highlights into the share URL', () => {
        const stubbedRegionHighlights = [
            { id: 1, sequence1Range: [2, 4], sequence2Range: [5, 7], color: '#123456', rangeText: '2-4&5-7', generated: false },
            { id: 2, sequence1Range: [8, 9], sequence2Range: [10, 11], color: '#654321', rangeText: '8-9&10-11', generated: true },
        ];
        const sandbox = createNavigationFixture({
            vaRRIOverrides: {
                getPointMutations: () => [],
                getSubsequenceHighlights: () => [],
                getRegionHighlights: () => stubbedRegionHighlights,
            },
        });

        const shareUrlText = sandbox.generateShareableURL();

        const shareUrl = new URL(shareUrlText);
        expect(shareUrl.searchParams.get('regionHighlights')).toBe('2-4&5-7:123456');
        expect(shareUrl.searchParams.get('regionHighlights')).not.toContain('8-9&10-11');
    });

    test('uses URLSearchParams encoding for parentheses', () => {
        const sandbox = createNavigationFixture({
            formElements: [{ id: 'structure', type: 'textarea', value: '((..))' }],
            vaRRIOverrides: {
                getPointMutations: () => [],
                getSubsequenceHighlights: () => [],
                getRegionHighlights: () => [],
            },
        });

        const shareUrlText = sandbox.generateShareableURL();

        expect(shareUrlText).toContain('structure=%28%28..%29%29');
    });

    test('rejects malformed URL alpha values', () => {
        const registeredHighlights = [];
        const sandbox = createNavigationFixture({
            vaRRIOverrides: {
                registerSubsequenceHighlight: input => registeredHighlights.push(input),
            },
        });

        sandbox.loadAllUrlParameters(
            new URLSearchParams('subseqHighlights=1:2-3:ff0000:0x5')
        );

        expect(registeredHighlights).toHaveLength(0);
    });
});
