import vaRRI from '../src/vaRRI.js';

describe('sequenceColoring', () => {
    test('maps all nucleotides in seq1 to lightblue', () => {
        const colors = vaRRI.sequenceColoring('ACG', '');
        expect(colors).toEqual(['lightblue', 'lightblue', 'lightblue']);
    });

    test('maps all nucleotides in seq2 to #F4BB44', () => {
        const colors = vaRRI.sequenceColoring('', 'GU');
        expect(colors).toEqual(['#F4BB44', '#F4BB44']);
    });

    test('concatenates seq1 colors then seq2 colors', () => {
        const colors = vaRRI.sequenceColoring('AC', 'GU');
        expect(colors).toEqual(['lightblue', 'lightblue', '#F4BB44', '#F4BB44']);
    });

    test('returns empty array for two empty sequences', () => {
        expect(vaRRI.sequenceColoring('', '')).toEqual([]);
    });
});

describe('getColors', () => {
    test('returns an object with all seven colour keys', () => {
        const colors = vaRRI.getColors();
        expect(colors).toHaveProperty('sequence1');
        expect(colors).toHaveProperty('sequence2');
        expect(colors).toHaveProperty('mutationColor');
        expect(colors).toHaveProperty('intermolecularHighlight');
        expect(colors).toHaveProperty('backgroundHighlight');
        expect(colors).toHaveProperty('subsequenceHighlight');
        expect(colors).toHaveProperty('basepair');
    });

    test('returns default sequence1 as lightblue', () => {
        expect(vaRRI.getColors().sequence1).toBe('lightblue');
    });

    test('returns default sequence2 as #F4BB44', () => {
        expect(vaRRI.getColors().sequence2).toBe('#F4BB44');
    });

    test('returns default mutationColor as Darkgreen', () => {
        expect(vaRRI.getColors().mutationColor).toBe('Darkgreen');
    });

    test('returns default basepair as red', () => {
        expect(vaRRI.getColors().basepair).toBe('red');
    });

    test('returns a copy (mutations do not affect the internal state)', () => {
        const colors = vaRRI.getColors();
        colors.sequence1 = 'black';
        expect(vaRRI.getColors().sequence1).toBe('lightblue');
    });
});

describe('setColors', () => {
    // Capture defaults so each test can restore them.
    let defaults;
    beforeAll(() => { defaults = vaRRI.getColors(); });
    afterEach(() => vaRRI.setColors(defaults));

    test('overrides a single colour key', () => {
        vaRRI.setColors({ sequence1: 'blue' });
        expect(vaRRI.getColors().sequence1).toBe('blue');
    });

    test('leaves other keys unchanged when only one key is overridden', () => {
        vaRRI.setColors({ sequence1: 'blue' });
        const colors = vaRRI.getColors();
        expect(colors.sequence2).toBe('#F4BB44');
        expect(colors.mutationColor).toBe('Darkgreen');
        expect(colors.intermolecularHighlight).toBe('red');
        expect(colors.backgroundHighlight).toBe('red');
        expect(colors.subsequenceHighlight).toBe('purple');
        expect(colors.basepair).toBe('red');
    });

    test('overrides multiple colour keys at once', () => {
        vaRRI.setColors({ sequence1: '#aabbcc', sequence2: '#ddeeff' });
        const colors = vaRRI.getColors();
        expect(colors.sequence1).toBe('#aabbcc');
        expect(colors.sequence2).toBe('#ddeeff');
    });

    test('overrides basepair colour key', () => {
        vaRRI.setColors({ basepair: '#123456' });
        expect(vaRRI.getColors().basepair).toBe('#123456');
    });

    test('sequenceColoring reflects updated colours after setColors', () => {
        vaRRI.setColors({ sequence1: '#111111', sequence2: '#222222' });
        const result = vaRRI.sequenceColoring('AC', 'GU');
        expect(result).toEqual(['#111111', '#111111', '#222222', '#222222']);
    });

    test('restores colours after reset', () => {
        vaRRI.setColors({ sequence1: 'blue' });
        vaRRI.setColors(defaults);
        expect(vaRRI.getColors().sequence1).toBe('lightblue');
    });
});

describe('normaliseRotationDegrees', () => {
    test('keeps angles already in range', () => {
        expect(vaRRI.normaliseRotationDegrees(90)).toBe(90);
        expect(vaRRI.normaliseRotationDegrees(-180)).toBe(-180);
        expect(vaRRI.normaliseRotationDegrees(180)).toBe(180);
    });

    test('wraps angles outside [-180, 180]', () => {
        expect(vaRRI.normaliseRotationDegrees(270)).toBe(-90);
        expect(vaRRI.normaliseRotationDegrees(-270)).toBe(90);
        expect(vaRRI.normaliseRotationDegrees(360)).toBe(0);
    });

    test('throws on non-finite values', () => {
        expect(() => vaRRI.normaliseRotationDegrees(NaN)).toThrow(/finite number/);
    });
});
