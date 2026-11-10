/**
 * A small markdown renderer for our own docs (the admin "How our features work" page).
 * Handles headings, paragraphs, bullet and numbered lists, tables, code blocks, "> " callouts,
 * bold-only lines as small subheadings, and **bold**, _italics_ and `code`. Everything is HTML-escaped first, so the doc can't inject markup.
 */
const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const slugify = (text: string): string =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const inline = (text: string): string => {
  const codes: string[] = [];
  let out = text.replace(/`([^`]+)`/g, (_, code: string) => `\u0000${codes.push(escapeHtml(code)) - 1}\u0000`);
  out = escapeHtml(out)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])_([^_]+)_(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>');
  return out.replace(/\u0000(\d+)\u0000/g, (_, i: string) => `<code>${codes[Number(i)]}</code>`);
};

const cells = (row: string): string[] =>
  row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());

export function renderSimpleMarkdown(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const html: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    if (line.startsWith('```')) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) body.push(lines[i++]);
      i++;
      html.push(`<pre><code>${escapeHtml(body.join('\n'))}</code></pre>`);
      continue;
    }

    if (line.startsWith('>')) {
      const body: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) body.push(lines[i++].replace(/^>\s?/, '').trim());
      html.push(`<aside class="md-callout"><p>${inline(body.join(' '))}</p></aside>`);
      continue;
    }

    const subheading = /^\*\*([^*]+)\*\*\s*$/.exec(line);
    if (subheading) {
      html.push(`<h3>${inline(subheading[1])}</h3>`);
      i++;
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const id = level === 2 ? ` id="${slugify(heading[2])}"` : '';
      html.push(`<h${level}${id}>${inline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    if (line.trim().startsWith('|') && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1] || '')) {
      const head = cells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(cells(lines[i++]));
      html.push(
        `<table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead>` +
        `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
      );
      continue;
    }

    const listMatch = /^(\s*)(-|\d+\.)\s+/.exec(line);
    if (listMatch) {
      const ordered = listMatch[2] !== '-';
      const items: string[] = [];
      while (i < lines.length && (ordered ? /^\d+\.\s+/ : /^-\s+/).test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(/^(-|\d+\.)\s+/, ''))}</li>`);
        i++;
      }
      html.push(ordered ? `<ol>${items.join('')}</ol>` : `<ul>${items.join('')}</ul>`);
      continue;
    }

    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|-\s|\d+\.\s|\||>)/.test(lines[i])) para.push(lines[i++].trim());
    if (!para.length) { para.push(line.trim()); i++; }
    html.push(`<p>${inline(para.join(' '))}</p>`);
  }
  return html.join('\n');
}
