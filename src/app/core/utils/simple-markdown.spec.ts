import { describe, expect, it } from 'vitest';
import { renderSimpleMarkdown } from './simple-markdown';

describe('renderSimpleMarkdown (admin feature docs)', () => {
  it('renders headings with anchors, paragraphs, bold, italics and inline code', () => {
    const html = renderSimpleMarkdown('# Title\n\n## The Stash\n\nSome **bold**, _soft_ and `code`.');
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<h2 id="the-stash">The Stash</h2>');
    expect(html).toContain('<p>Some <strong>bold</strong>, <em>soft</em> and <code>code</code>.</p>');
  });

  it('renders bullet and numbered lists, tables and code blocks', () => {
    const html = renderSimpleMarkdown('- a\n- b\n\n1. one\n2. two\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n```bash\ncd server\n```');
    expect(html).toContain('<ul><li>a</li><li>b</li></ul>');
    expect(html).toContain('<ol><li>one</li><li>two</li></ol>');
    expect(html).toContain('<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>');
    expect(html).toContain('<pre><code>cd server</code></pre>');
  });

  it('escapes HTML so the doc can never inject markup', () => {
    const html = renderSimpleMarkdown('Hi <script>alert(1)</script> & `<b>`');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&amp;');
    expect(html).toContain('<code>&lt;b&gt;</code>');
    expect(html).not.toContain('<script>');
  });

  it('turns "> " lines into a callout box, keeping the bold label', () => {
    const html = renderSimpleMarkdown('> **Important:** the local API uses the live database.\n> Be careful.');
    expect(html).toBe('<aside class="md-callout"><p><strong>Important:</strong> the local API uses the live database. Be careful.</p></aside>');
  });

  it('turns a line that is only bold into a small subheading', () => {
    expect(renderSimpleMarkdown('**Reading the results**')).toBe('<h3>Reading the results</h3>');
    expect(renderSimpleMarkdown('**Bold** then text')).toBe('<p><strong>Bold</strong> then text</p>');
  });
});
