"""Convert financial-projection.md to a branded PDF using ReportLab.

Mirrors the dutaintegra.my palette: navy (#0B1D3A), electric cyan (#00B4FF),
white, gray. Uses DejaVu Sans for full Unicode glyph coverage.
"""

import re
from pathlib import Path

import markdown
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
)


SRC = Path(__file__).parent / "financial-projection.md"
OUT = Path(__file__).parent / "financial-projection.pdf"

NAVY = colors.HexColor("#0B1D3A")
ELECTRIC = colors.HexColor("#00B4FF")
DARK = colors.HexColor("#060F1F")
WHITE = colors.HexColor("#FFFFFF")
GRAY = colors.HexColor("#8A9BB5")
LIGHT_BG = colors.HexColor("#F0F6FF")
ROW_ALT = colors.HexColor("#EBF4FF")
RULE = colors.HexColor("#D8E5F5")

pdfmetrics.registerFont(TTFont("DejaVu", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("DejaVu-Bold", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"))
from reportlab.pdfbase.pdfmetrics import registerFontFamily
registerFontFamily(
    "DejaVu",
    normal="DejaVu",
    bold="DejaVu-Bold",
    italic="DejaVu",
    boldItalic="DejaVu-Bold",
)


def make_styles():
    s = getSampleStyleSheet()
    base = ParagraphStyle(
        "base",
        parent=s["Normal"],
        fontName="DejaVu",
        fontSize=10.5,
        leading=15,
        textColor=DARK,
    )
    h1 = ParagraphStyle(
        "h1",
        parent=base,
        fontName="DejaVu-Bold",
        fontSize=22,
        leading=28,
        textColor=NAVY,
        spaceBefore=4,
        spaceAfter=6,
    )
    h2 = ParagraphStyle(
        "h2",
        parent=base,
        fontName="DejaVu-Bold",
        fontSize=15,
        leading=20,
        textColor=NAVY,
        spaceBefore=14,
        spaceAfter=6,
        borderPadding=(2, 0, 2, 0),
    )
    h3 = ParagraphStyle(
        "h3",
        parent=base,
        fontName="DejaVu-Bold",
        fontSize=12,
        leading=16,
        textColor=ELECTRIC,
        spaceBefore=10,
        spaceAfter=4,
    )
    body = ParagraphStyle(
        "body",
        parent=base,
        fontSize=10,
        leading=14.5,
        textColor=DARK,
        spaceAfter=4,
    )
    li = ParagraphStyle(
        "li",
        parent=body,
        leftIndent=12,
        bulletIndent=2,
        spaceAfter=2,
    )
    meta = ParagraphStyle(
        "meta",
        parent=base,
        fontSize=9,
        textColor=GRAY,
        alignment=0,
    )
    strong = ParagraphStyle(
        "strong",
        parent=body,
        fontName="DejaVu-Bold",
        textColor=NAVY,
    )
    return {
        "h1": h1,
        "h2": h2,
        "h3": h3,
        "body": body,
        "li": li,
        "meta": meta,
        "strong": strong,
    }


def md_inline_to_html(text: str) -> str:
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)", r"<i>\1</i>", text)
    text = re.sub(r"`([^`]+)`", r"<font face='DejaVu-Bold' color='#0B1D3A'>\1</font>", text)
    return text


def style_table(table: Table, header_rows: int = 1):
    cmds = [
        ("BACKGROUND", (0, 0), (-1, header_rows - 1), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, header_rows - 1), WHITE),
        ("ALIGN", (0, 0), (-1, header_rows - 1), "CENTER"),
        ("ALIGN", (0, header_rows), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, RULE),
        ("LINEBELOW", (0, 0), (-1, 0), 2, ELECTRIC),
    ]
    for r in range(header_rows, len(table._cellvalues)):
        if (r - header_rows) % 2 == 1:
            cmds.append(("BACKGROUND", (0, r), (-1, r), ROW_ALT))
    table.setStyle(TableStyle(cmds))


def add_header_footer(canvas, doc):
    canvas.saveState()
    width, _ = A4

    canvas.setFillColor(NAVY)
    canvas.rect(0, doc.pagesize[1] - 14 * mm, width, 14 * mm, fill=1, stroke=0)
    canvas.setFillColor(ELECTRIC)
    canvas.rect(0, doc.pagesize[1] - 16 * mm, width, 2 * mm, fill=1, stroke=0)

    canvas.setFillColor(WHITE)
    canvas.setFont("DejaVu-Bold", 9)
    canvas.drawString(20 * mm, doc.pagesize[1] - 9 * mm, "DUTA INTEGRA SOLUTIONS")
    canvas.setFillColor(ELECTRIC)
    canvas.setFont("DejaVu", 8)
    canvas.drawRightString(width - 20 * mm, doc.pagesize[1] - 9 * mm, "Financial Projection 2026–2028")

    canvas.setFillColor(GRAY)
    canvas.setFont("DejaVu", 8)
    page_num = canvas.getPageNumber()
    canvas.drawCentredString(width / 2, 10 * mm, f"Page {page_num}")
    canvas.drawString(20 * mm, 10 * mm, "Duta Integra Solutions Sdn Bhd  ·  Cyberjaya, Malaysia")
    canvas.drawRightString(width - 20 * mm, 10 * mm, "Confidential")

    canvas.restoreState()


def build_table(rows):
    paras = []
    for i, row in enumerate(rows):
        if i == 0:
            paras.append(
                [
                    Paragraph(
                        md_inline_to_html(c),
                        ParagraphStyle(
                            "th",
                            fontName="DejaVu-Bold",
                            fontSize=9,
                            textColor=WHITE,
                            alignment=1,
                        ),
                    )
                    for c in row
                ]
            )
        else:
            cells = []
            for c in row:
                is_bold_col = c.lstrip().startswith("**")
                style = ParagraphStyle(
                    "td",
                    fontName="DejaVu-Bold" if is_bold_col else "DejaVu",
                    fontSize=9,
                    textColor=NAVY if is_bold_col else DARK,
                    leading=12,
                )
                cells.append(Paragraph(md_inline_to_html(c), style))
            paras.append(cells)
    return paras


def main():
    md_text = SRC.read_text(encoding="utf-8")
    md = markdown.Markdown(extensions=["tables", "extra"])
    tokens = md.convert(md_text)

    styles = make_styles()
    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=28 * mm,
        bottomMargin=20 * mm,
        title="Duta Integra Solutions — Financial Projection 2026-2028",
        author="Duta Integra Solutions Sdn Bhd",
    )

    flow = []

    title_added = False
    lines = tokens.split("\n")

    i = 0
    in_list = False
    list_items = []

    while i < len(lines):
        line = lines[i].strip()

        if not line:
            if in_list:
                for item in list_items:
                    flow.append(Paragraph(item, styles["li"]))
                list_items = []
                in_list = False
            flow.append(Spacer(1, 4))
            i += 1
            continue

        if line.startswith("<h1"):
            inner = re.sub(r"</?h1>", "", line).strip()
            flow.append(Paragraph(md_inline_to_html(inner), styles["h1"]))
            title_added = True
            i += 1
            continue

        if line.startswith("<h2"):
            inner = re.sub(r"</?h2>", "", line).strip()
            if not title_added:
                flow.append(Spacer(1, 4))
                title_added = True
            flow.append(Paragraph(md_inline_to_html(inner), styles["h2"]))
            i += 1
            continue

        if line.startswith("<h3"):
            inner = re.sub(r"</?h3>", "", line).strip()
            flow.append(Paragraph(md_inline_to_html(inner), styles["h3"]))
            i += 1
            continue

        if line.startswith("<table"):
            j = i
            while j < len(lines) and not lines[j].strip().endswith("</table>"):
                j += 1
            block = "\n".join(lines[i:j + 1])

            row_re = re.compile(r"<tr>(.*?)</tr>", re.DOTALL)
            cell_re = re.compile(r"<t[hd][^>]*>(.*?)</t[hd]>", re.DOTALL)

            rows = []
            for tr in row_re.findall(block):
                cells = []
                for cell in cell_re.findall(tr):
                    cell = re.sub(r"<[^>]+>", "", cell).strip()
                    cells.append(cell)
                if cells and not all(c == "" for c in cells):
                    rows.append(cells)
            if rows:
                data = build_table(rows)
                col_widths = [170 * mm / max(len(rows[0]), 1)] * len(rows[0])
                weight_first = 2.0
                total_units = weight_first + (len(rows[0]) - 1)
                avail = 170 * mm
                col_widths = [avail * weight_first / total_units] + [avail / total_units] * (len(rows[0]) - 1)
                tbl = Table(data, colWidths=col_widths, hAlign="CENTER", repeatRows=1)
                style_table(tbl, header_rows=1)
                flow.append(Spacer(1, 4))
                flow.append(tbl)
                flow.append(Spacer(1, 8))
            i = j + 1
            continue

        if line.startswith("<ul>"):
            in_list = True
            i += 1
            continue
        if line.startswith("</ul>"):
            for item in list_items:
                flow.append(Paragraph(item, styles["li"]))
            list_items = []
            in_list = False
            i += 1
            continue
        if line.startswith("<li>"):
            inner = re.sub(r"</?li>", "", line).strip()
            inner = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", inner)
            list_items.append("•  " + inner)
            i += 1
            continue

        if line.startswith("<hr"):
            flow.append(Spacer(1, 6))
            i += 1
            continue

        if line.startswith("<p>"):
            inner = re.sub(r"</?p>", "", line).strip()
            inner = md_inline_to_html(inner)
            if inner:
                flow.append(Paragraph(inner, styles["body"]))
            i += 1
            continue

        i += 1

    doc.build(flow, onFirstPage=add_header_footer, onLaterPages=add_header_footer)
    print(f"Wrote {OUT}  ({OUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
