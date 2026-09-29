import { createIndexSandbox } from './helpers/ui-sandbox.js';

describe('region input helpers', () => {
    test('normalizes region range strings by removing whitespace', () => {
        const sandbox = createIndexSandbox();

        expect(sandbox.normalizeRegionInput(' 2 - 4 ')).toBe('2-4');
        expect(sandbox.normalizeRegionInput('')).toBe('');
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
        const sandbox = createIndexSandbox({
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
        sandbox.loadUrlRegionHighlightsToVaRRI('regionHighlights', shareUrl.searchParams);

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
        const sandbox = createIndexSandbox({
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
        const sandbox = createIndexSandbox({
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
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const sandbox = createIndexSandbox({
            vaRRIOverrides: {
                registerSubsequenceHighlight: input => registeredHighlights.push(input),
            },
        });

        sandbox.loadUrlSubsequenceHighlightsToVaRRI(
            'subseqHighlights',
            new URLSearchParams('subseqHighlights=1:2-3:ff0000:0x5')
        );

        expect(registeredHighlights).toHaveLength(0);
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid subsequence highlight format'));
        warnSpy.mockRestore();
    });
});
