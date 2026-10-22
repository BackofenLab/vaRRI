function parseBibTeX(bibText) {
  const fields = {};
  const matches = bibText.matchAll(/(\w+)\s*=\s*[{"]([^}"]+)[}"]/g);
  for (const match of matches) {
    fields[match[1].toLowerCase()] = match[2].trim();
  }
  return fields;
}

export function formatCitation(bibText, style) {
  const b = parseBibTeX(bibText);
  const authors = b.author || 'Unknown Author';
  const title = b.title || 'Untitled';
  const year = b.year || 'n.d.';
  const journal = b.journal || b.booktitle || '';
  const volume = b.volume ? `, ${b.volume}` : '';
  const number = b.number ? `(${b.number})` : '';
  const pages = b.pages ? `, ${b.pages}` : '';
  const doi = b.doi ? ` https://doi.org/${b.doi}` : '';
  const url = b.url ? ` ${b.url}` : '';
  const link = doi || url;
  const note = b.note ? ` (${b.note})` : '';
  const RIS_type = journal == '' ? 'COMP' : 'JOUR';

  if (style === 'apa') {
    return `${authors} (${year}). ${title}. ${journal}${volume}${number}${pages}.${note}${link}`;
  }
  
  if (style === 'ieee') {
    return `${authors}, "${title}," ${journal}${volume}${number}${pages}, ${year}.${note}${link}`;
  }
  
  if (style === 'ris') {
    const risLines = [
      `TY  - ${RIS_type}`,
      `AU  - ${authors}`,
      `TI  - ${title}`,
      `JO  - ${journal}`,
      `PY  - ${year}`,
      `VL  - ${b.volume || ''}`,
      `IS  - ${b.number || ''}`,
      `SP  - ${b.pages || ''}`,
      `DO  - ${b.doi || ''}`,
      `UR  - ${b.url || ''}`,
      `AB  - ${b.abstract || ''}`,
      `N1  - ${b.note || ''}`
    ];

    if (b.keywords) {
      b.keywords.split(/[,;]/).forEach(kw => {
        if (kw.trim()) risLines.push(`KW  - ${kw.trim()}`);
      });
    }

    risLines.push('ER  -');
    return risLines.filter(line => !line.endsWith('  - ')).join('\n');
  }

  return bibText;
}

