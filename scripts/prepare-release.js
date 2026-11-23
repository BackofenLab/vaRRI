import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { releaseMetadata } from './release-metadata.js';

function replaceOne(content, pattern, replacement, description) {
  const matches = [...content.matchAll(pattern)];
  if (matches.length !== 1) throw new Error(`Expected exactly one ${description}, found ${matches.length}`);
  return content.replace(pattern, replacement);
}

function validateDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date.startsWith('0000-')) {
    throw new Error('Release date must be a valid YYYY-MM-DD date');
  }
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new Error('Release date must be a valid YYYY-MM-DD date');
  }
}

export function prepareRelease(root, tag, date) {
  const { version } = releaseMetadata(tag);
  validateDate(date);
  const names = ['package.json', 'package-lock.json', 'CITATION.cff', 'CITATION.bib', 'Changelog.md'];
  const files = Object.fromEntries(names.map(name => [name, readFileSync(path.join(root, name), 'utf8')]));
  const manifest = JSON.parse(files['package.json']);
  const lock = JSON.parse(files['package-lock.json']);
  if (!manifest.version || lock.version !== manifest.version ||
      lock.packages?.['']?.version !== manifest.version) {
    throw new Error('Package and lockfile versions must agree before preparing a release');
  }
  manifest.version = version;
  lock.version = version;
  lock.packages[''].version = version;
  for (const [name, data] of [['package.json', manifest], ['package-lock.json', lock]]) {
    const newline = files[name].includes('\r\n') ? '\r\n' : '\n';
    files[name] = JSON.stringify(data, null, 2).replace(/\n/g, newline) + newline;
  }
  files['CITATION.cff'] = replaceOne(files['CITATION.cff'], /^version:[^\r\n]*/gm,
    `version: ${version}`, 'CFF version');
  files['CITATION.cff'] = replaceOne(files['CITATION.cff'], /^date-released:[^\r\n]*/gm,
    `date-released: '${date}'`, 'CFF release date');
  files['CITATION.bib'] = replaceOne(files['CITATION.bib'], /^(\s*version\s*=\s*)\{[^}\r\n]*\}/gm,
    `$1{${version}}`, 'BibTeX version');
  files['CITATION.bib'] = replaceOne(files['CITATION.bib'], /^(\s*year\s*=\s*)\{[^}\r\n]*\}/gm,
    `$1{${date.slice(0, 4)}}`, 'BibTeX year');
  const changelog = files['Changelog.md'];
  const heading = /^ {0,3}##(?:[ \t]+[^\r\n]*)?(?=\r?$)/m.exec(changelog);
  if (!heading) throw new Error('Changelog must contain a second-level heading');
  const releaseHeading = `## Version ${version} · ${date}`;
  if (heading[0] !== releaseHeading) {
    const newline = changelog.includes('\r\n') ? '\r\n' : '\n';
    files['Changelog.md'] = 
      changelog.slice(0, heading.index) + 
      // insert placeholder headings for unreleased changes and development history after release
      '## Unreleased changes' + newline +
      newline +
      '### Development history' + newline +
      newline +
      // insert release heading
      releaseHeading + newline + 
      // append the rest of the changelog after the first second-level heading
      changelog.slice(heading.index+1);
  }
  for (const name of names) writeFileSync(path.join(root, name), files[name]);
  return version;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const version = prepareRelease(process.cwd(), process.env.RELEASE_TAG, process.env.RELEASE_DATE);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\n`);
  console.log(`Prepared ${version} for ${process.env.RELEASE_DATE}`);
}
