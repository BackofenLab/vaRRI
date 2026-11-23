import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareRelease } from '../scripts/prepare-release.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const names = ['package.json', 'package-lock.json', 'CITATION.cff', 'CITATION.bib', 'Changelog.md'];
let temp;

beforeEach(() => {
    temp = fs.mkdtempSync(path.join(os.tmpdir(), 'varri-release-test-'));
    for (const name of names) fs.copyFileSync(path.join(root, name), path.join(temp, name));
});

afterEach(() => fs.rmSync(temp, { recursive: true, force: true }));

const read = name => fs.readFileSync(path.join(temp, name), 'utf8');

test('prepares consistent metadata through the workflow entry point and is repeatable', () => {
    const output = path.join(temp, 'output');
    const env = { ...process.env, RELEASE_TAG: 'v2.0.0-beta.1', RELEASE_DATE: '2027-02-28', GITHUB_OUTPUT: output };
    const run = () => execFileSync(process.execPath, [path.join(root, 'scripts', 'prepare-release.js')], {
        cwd: temp, env, encoding: 'utf8',
    });
    const oldChangelog = read('Changelog.md');
    run();
    const manifest = JSON.parse(read('package.json'));
    const lock = JSON.parse(read('package-lock.json'));
    expect(manifest.version).toBe('2.0.0-beta.1');
    expect(lock.version).toBe(manifest.version);
    expect(lock.packages[''].version).toBe(manifest.version);
    expect(read('CITATION.cff')).toMatch(/^version: 2\.0\.0-beta\.1\r?$/m);
    expect(read('CITATION.cff')).toMatch(/^date-released: '2027-02-28'\r?$/m);
    expect(read('CITATION.bib')).toMatch(/version\s*=\s*\{2\.0\.0-beta\.1\}/);
    expect(read('CITATION.bib')).toMatch(/year\s*=\s*\{2027\}/);
    expect(read('Changelog.md')).toBe(oldChangelog.replace(
        /^## Version [^\r\n]*pre-release \(unreleased\)[^\r\n]*/m,
        '## Version 2.0.0-beta.1 pre-release (unreleased)'
    ));
    expect(read('output')).toBe('version=2.0.0-beta.1\n');
    const prepared = names.map(read);
    run();
    expect(names.map(read)).toEqual(prepared);
});

test.each([
    ['v2.0.0+build.1', '2027-02-28'],
    ['v2.0.0', '2027-02-29'],
    ['v2.0.0', '2027-2-01'],
    ['v2.0.0', ''],
])('rejects invalid tag or date before changing files: %s, %s', (tag, date) => {
    const original = names.map(read);
    expect(() => prepareRelease(temp, tag, date)).toThrow();
    expect(names.map(read)).toEqual(original);
});

test('rejects inconsistent lockfiles and missing changelog headings without partial changes', () => {
    const lock = JSON.parse(read('package-lock.json'));
    lock.packages[''].version = '0.0.1';
    fs.writeFileSync(path.join(temp, 'package-lock.json'), JSON.stringify(lock));
    let original = names.map(read);
    expect(() => prepareRelease(temp, '2.0.0', '2028-02-29')).toThrow(/versions must agree/);
    expect(names.map(read)).toEqual(original);

    fs.copyFileSync(path.join(root, 'package-lock.json'), path.join(temp, 'package-lock.json'));
    fs.writeFileSync(path.join(temp, 'Changelog.md'), '# No unreleased section\n');
    original = names.map(read);
    expect(() => prepareRelease(temp, '2.0.0', '2028-02-29')).toThrow(/unreleased changelog heading/);
    expect(names.map(read)).toEqual(original);
});
