#!/usr/bin/env python3
"""
Markdown to PDF converter using PyMuPDF (no npm dependencies).

Usage:
    python3 src/md-to-pdf.py <input.md> [output.pdf]

If output path is omitted, replaces .md with .pdf in the same directory.
Supports: headers, tables, code blocks (with preserved ASCII art), lists,
bold, italic, inline code, and horizontal rules.
"""

import sys
import re
import pymupdf


def apply_inline(text):
    """Apply inline markdown formatting (bold, italic, inline code)."""
    text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
    text = re.sub(r'(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)', r'<i>\1</i>', text)
    text = re.sub(
        r'`([^`]+)`',
        r'<code style="font-family: Courier; font-size: 8px; background-color: #f0f0f0; padding: 1px 3px;">\1</code>',
        text,
    )
    return text


def parse_table_row(row_line):
    """Parse a markdown table row into cells."""
    return [c.strip() for c in row_line.strip().strip('|').split('|')]


def md_to_html(md):
    """Convert markdown text to styled HTML suitable for PyMuPDF Story API."""
    lines = md.split('\n')
    html_parts = []
    in_code_block = False
    code_lines = []
    i = 0

    while i < len(lines):
        line = lines[i]

        # --- Code blocks ---
        if line.strip().startswith('```'):
            if in_code_block:
                code_content = '\n'.join(code_lines)
                code_content = (
                    code_content.replace('&', '&amp;')
                    .replace('<', '&lt;')
                    .replace('>', '&gt;')
                )
                code_content = code_content.replace(' ', '&nbsp;')
                code_content = code_content.replace('\n', '<br/>')
                html_parts.append(
                    '<div style="background-color: #f5f5f5; padding: 8px; margin: 6px 0;">'
                    '<span style="font-family: Courier; font-size: 6.5px; white-space: pre;">'
                    f'{code_content}</span></div>'
                )
                code_lines = []
                in_code_block = False
            else:
                in_code_block = True
            i += 1
            continue

        if in_code_block:
            code_lines.append(line)
            i += 1
            continue

        # --- Tables ---
        if '|' in line and line.strip().startswith('|') and line.strip().endswith('|'):
            table_lines = []
            while i < len(lines) and '|' in lines[i] and lines[i].strip().startswith('|'):
                table_lines.append(lines[i])
                i += 1

            if len(table_lines) >= 2:
                header_line = table_lines[0]
                data_lines = [
                    l for l in table_lines[1:]
                    if not re.match(r'^\s*\|[\s\-:|]+\|\s*$', l)
                ]

                headers = parse_table_row(header_line)
                table_html = (
                    '<table style="border-collapse: collapse; width: 100%; margin: 6px 0; font-size: 8px;">'
                )
                # Header row
                table_html += '<tr>'
                for h in headers:
                    h = apply_inline(h)
                    table_html += (
                        '<td style="border: 1px solid #ccc; padding: 4px 6px; '
                        f'background-color: #e8e8e8; font-weight: bold;">{h}</td>'
                    )
                table_html += '</tr>'
                # Data rows
                for dl in data_lines:
                    cells = parse_table_row(dl)
                    table_html += '<tr>'
                    for c in cells:
                        c = apply_inline(c)
                        table_html += (
                            f'<td style="border: 1px solid #ccc; padding: 3px 6px;">{c}</td>'
                        )
                    table_html += '</tr>'
                table_html += '</table>'
                html_parts.append(table_html)
            continue

        # --- Horizontal rules ---
        if line.strip() == '---':
            html_parts.append('<hr style="margin: 8px 0;"/>')
            i += 1
            continue

        # --- Headers ---
        header_match = re.match(r'^(#{1,6})\s+(.*)', line)
        if header_match:
            level = len(header_match.group(1))
            text = apply_inline(header_match.group(2))
            sizes = {1: 18, 2: 15, 3: 13, 4: 11, 5: 10, 6: 10}
            colors = {1: '#1a1a1a', 2: '#2a2a2a', 3: '#3a3a3a', 4: '#4a4a4a', 5: '#555', 6: '#555'}
            sz = sizes.get(level, 10)
            clr = colors.get(level, '#333')
            margin_top = 12 if level <= 2 else 8
            html_parts.append(
                f'<p style="font-size: {sz}px; font-weight: bold; color: {clr}; '
                f'margin: {margin_top}px 0 4px 0;">{text}</p>'
            )
            i += 1
            continue

        # --- List items (bulleted and numbered) ---
        list_match = re.match(r'^(\s*)([-*]|\d+\.)\s+(.*)', line)
        if list_match:
            indent = len(list_match.group(1))
            marker = list_match.group(2)
            content = apply_inline(list_match.group(3))
            margin_left = indent * 5 + 15
            bullet = marker if marker[0].isdigit() else '\u2022'
            html_parts.append(
                f'<p style="margin: 1px 0 1px {margin_left}px; font-size: 10px;">'
                f'{bullet} {content}</p>'
            )
            i += 1
            continue

        # --- Empty line ---
        if line.strip() == '':
            html_parts.append('<p style="font-size: 4px;">&nbsp;</p>')
            i += 1
            continue

        # --- Regular paragraph ---
        text = apply_inline(line)
        html_parts.append(f'<p style="font-size: 10px; margin: 2px 0;">{text}</p>')
        i += 1

    return '\n'.join(html_parts)


def convert(input_path, output_path=None):
    """Convert a markdown file to PDF."""
    if output_path is None:
        output_path = re.sub(r'\.md$', '.pdf', input_path)

    with open(input_path, 'r') as f:
        md_text = f.read()

    html_content = md_to_html(md_text)
    full_html = (
        '<html><head><style>'
        'body { font-family: Helvetica, Arial, sans-serif; font-size: 10px; line-height: 1.3; }'
        '</style></head><body>'
        f'{html_content}'
        '</body></html>'
    )

    story = pymupdf.Story(html=full_html)
    writer = pymupdf.DocumentWriter(output_path)
    mediabox = pymupdf.paper_rect('a4')
    content_rect = mediabox + (40, 40, -40, -40)

    while True:
        device = writer.begin_page(mediabox)
        more, _ = story.place(content_rect)
        story.draw(device)
        writer.end_page()
        if not more:
            break

    writer.close()

    doc = pymupdf.open(output_path)
    pages = len(doc)
    doc.close()

    print(f"PDF generated: {output_path} ({pages} pages)")
    return output_path


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <input.md> [output.pdf]")
        sys.exit(1)

    md_path = sys.argv[1]
    pdf_path = sys.argv[2] if len(sys.argv) > 2 else None
    convert(md_path, pdf_path)
