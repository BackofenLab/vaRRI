import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import vaRRI from '../../src/vaRRI.js';

const indexScriptSource = fs.readFileSync(path.join(__dirname, '../../index.js'), 'utf8');

export function createIndexSandbox(options = {}) {
const formElements = options.formElements || [];

    // Dummy 2D-Context für Canvas
    const createMock2DContext = () => ({
        fillRect: () => {},
        clearRect: () => {},
        getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
        putImageData: () => {},
        createImageData: () => [],
        setTransform: () => {},
        drawImage: () => {},
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        closePath: () => {},
        stroke: () => {},
        fill: () => {},
        arc: () => {},
        rect: () => {},
        fillText: () => {},
        strokeText: () => {},
        measureText: () => ({ width: 0, actualBoundingBoxAscent: 0, actualBoundingBoxDescent: 0 }),
        translate: () => {},
        scale: () => {},
        rotate: () => {},
    });

    // Hilfsfunktion zur Erstellung von Dummy-DOM-Elementen
    const createMockElement = (tagName = 'div') => {
        const element = {
            tagName: String(tagName).toUpperCase(),
            value: '',
            checked: false,
            type: '',
            textContent: '',
            innerHTML: '',
            style: {},
            width: 300,  // Standard-Canvas Breiten-/Höhenwerte
            height: 150,
            classList: {
                add: () => {},
                remove: () => {},
                toggle: () => {},
                contains: () => false,
            },
            setAttribute: () => {},
            getAttribute: () => null,
            removeAttribute: () => {},
            appendChild: (child) => child,
            removeChild: (child) => child,
            replaceChild: (child) => child,
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => true,
            closest: () => null,
            querySelector: () => null,
            querySelectorAll: () => [],

            // <-- HIER HINZUGEFÜGT: getContext Support
            getContext: (contextType) => {
                if (contextType === '2d') {
                    return createMock2DContext();
                }
                return null;
            },
            toDataURL: () => 'data:image/png;base64,',
        };

        return element;
    };

    const document = {
        createElement: (tagName) => createMockElement(tagName), // <-- HIER HINZUGEFÜGT
        getElementById: () => createMockElement('div'),
        querySelectorAll: selector => selector === 'input, textarea, select' ? formElements : [],
    };

    const navigator = options.clipboardWrite
        ? { clipboard: { writeText: options.clipboardWrite } }
        : {};

    const window = {
        location: {
            protocol: 'https:',
            origin: 'https://example.test',
            pathname: '/index.html',
            search: '',
            href: 'https://example.test/index.html',
        },
        addEventListener: () => {},
        document,
        navigator,
        console,
        URLSearchParams,
        setTimeout,
        clearTimeout,
    };

    const sandbox = {
        window,
        document,
        navigator,
        console,
        URLSearchParams,
        setTimeout,
        clearTimeout,
        module: { exports: {} },
    };

    window.window = window;
    sandbox.vaRRI = { ...vaRRI, ...(options.vaRRIOverrides || {}) };
    window.vaRRI = sandbox.vaRRI;

    vm.createContext(sandbox);
    vm.runInContext(indexScriptSource, sandbox);

    sandbox.getSequenceContext = () => ({
        '1': { offset: 1, length: 4 },
        '2': { offset: 1, length: 4 },
    });
    sandbox.getDefaultSubsequenceHighlightColor = () => '#ff0000';
    sandbox.getDefaultRegionHighlightColor = () => '#ff0000';
    sandbox.getDefaultMutationColor = () => '#ff0000';

    return sandbox;
}
