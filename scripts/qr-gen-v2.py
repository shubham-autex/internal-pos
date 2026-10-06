#!/usr/bin/env python3
"""
Micro QR hang-tags on an A4 PDF - LANDSCAPE labels:

    +------------------------------------------+
    |  (○)  [ QR ]   gap   BRAND NAME          |
    |       [ QR ]         (blank space        |
    |       CODE            write by hand)     |
    +------------------------------------------+

Install:  pip install segno reportlab
Run:      python scripts/qr-gen-v2.py
Print:    open the PDF and print at 100% / "Actual size" (NOT "Fit to page").
"""
import segno
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.pdfbase.pdfmetrics import stringWidth

# ---------------- SETTINGS (edit these) ----------------
PREFIX      = "PJMS26D"
START, END  = 1, 50
DIGITS      = 3                 # 001, 002 ...
OUTPUT_PDF  = "micro_qr_labels.pdf"

# ---- HOW MANY LABELS TO PRINT FOR EACH CODE ----
COPIES_PER_CODE = 20
COPIES_OVERRIDE = {             # optional: different count for specific codes
    # "PJMS26D005": 10,
    # "PJMS26D012": 1,
}
GROUP_COPIES = True             # True  -> 001,001,001,002,002,002 ...
                                # False -> 001,002 ... 009, then 001,002 ... again

# ---- QR SETTINGS ----
QR_TYPE     = "micro"           # "micro" = Micro QR (smallest) | "standard" = normal QR (any phone camera)
ERROR_LEVEL = "l"               # "l" = simplest pattern, "m" = more damage-proof
QUIET_MOD   = 2 if QR_TYPE == "micro" else 4   # white border (in dots) around the QR

# ---- LABEL LAYOUT (landscape) ----
CELL_W_MM   = 45                # label width
CELL_H_MM   = 20                # label height
CELL_PAD_MM = 1.0               # empty space kept inside the label edge
CELL_GAP_MM = 2.0               # gap BETWEEN labels on the sheet (for cutting)
QR_TEXT_GAP_MM = 2.0            # extra gap between the QR column and the text on its right
MARGIN_MM   = 10                # page margin

# ---- HANG HOLE (left side) ----
HOLE_DIAM_MM = 3.0              # punch-hole diameter (guide circle)
HOLE_ZONE_MM = 6.0              # horizontal space reserved for the hole
SHOW_HOLE   = True              # draw a light guide circle for punching

# ---- TEXT ----
BRAND_NAME  = "AARAMBHA"            # shown on the right (where the code used to be)
BRAND_FONT  = "Helvetica-Bold"
BRAND_PT    = 8
BRAND_DROP_MM = 3.0             # push brand name down from the top edge
CODE_FONT   = "Helvetica-Bold"
CODE_PT     = 5.5               # product code under the QR; shrinks if too wide
CODE_GAP_MM = 0.8               # gap between QR quiet zone and code under it
# Everything below the brand on the right is left BLANK for hand-writing price etc.

CUT_LINES   = True              # light grey dashed guide around each label
# -------------------------------------------------------


def make_qr(text):
    return segno.make(text, micro=(QR_TYPE == "micro"), error=ERROR_LEVEL, boost_error=False)


def draw_qr(c, qr, x, y, module):
    """Draw QR as vector squares. (x, y) = bottom-left of the symbol (no quiet zone)."""
    rows = list(qr.matrix)
    n = len(rows)
    c.setFillColorRGB(0, 0, 0)
    for r, row in enumerate(rows):
        for col, v in enumerate(row):
            if v:
                c.rect(x + col * module, y + (n - 1 - r) * module,
                       module + 0.02 * mm, module + 0.02 * mm, stroke=0, fill=1)
    return n


def fit_font(text, font, max_pt, max_width):
    pt = max_pt
    while pt > 3 and stringWidth(text, font, pt) > max_width:
        pt -= 0.25
    return pt


def build_label_list():
    base = [f"{PREFIX}{i:0{DIGITS}d}" for i in range(START, END + 1)]
    copies = {code: COPIES_OVERRIDE.get(code, COPIES_PER_CODE) for code in base}
    if GROUP_COPIES:
        return [code for code in base for _ in range(copies[code])]
    labels, rounds = [], max(copies.values())
    for k in range(rounds):
        labels += [code for code in base if copies[code] > k]
    return labels


def main():
    codes = build_label_list()
    page_w, page_h = A4
    cw, ch, mg = CELL_W_MM * mm, CELL_H_MM * mm, MARGIN_MM * mm
    gap = CELL_GAP_MM * mm
    pad = CELL_PAD_MM * mm
    hole_zone = HOLE_ZONE_MM * mm if SHOW_HOLE else 0
    code_gap = CODE_GAP_MM * mm

    n_modules = len(list(make_qr(codes[0]).matrix))
    total_mod = n_modules + 2 * QUIET_MOD

    # Reserve space under the QR for the product code; QR fills remaining height.
    code_band_mm = CODE_PT * 0.35 + CODE_GAP_MM   # approx text height + gap
    avail_h_mm = CELL_H_MM - 2 * CELL_PAD_MM - code_band_mm
    module_mm = avail_h_mm / total_mod
    module = module_mm * mm
    qr_box = total_mod * module                   # QR + quiet zone

    cols = int((page_w - 2 * mg + gap) // (cw + gap))
    rows = int((page_h - 2 * mg + gap) // (ch + gap))
    per_page = cols * rows

    grid_w = cols * cw + (cols - 1) * gap
    grid_h = rows * ch + (rows - 1) * gap
    x0 = (page_w - grid_w) / 2
    y0 = page_h - (page_h - grid_h) / 2          # top of grid

    c = canvas.Canvas(OUTPUT_PDF, pagesize=A4)
    c.setTitle("Micro QR Labels")

    for idx, code in enumerate(codes):
        pos = idx % per_page
        if idx and pos == 0:
            c.showPage()
        r, col = divmod(pos, cols)
        cell_x = x0 + col * (cw + gap)
        cell_top = y0 - r * (ch + gap)
        cell_bottom = cell_top - ch
        cell_mid_y = cell_bottom + ch / 2

        if CUT_LINES:
            c.setStrokeColorRGB(0.75, 0.75, 0.75)
            c.setLineWidth(0.3)
            c.setDash(1.5, 1.5)
            c.rect(cell_x, cell_bottom, cw, ch, stroke=1, fill=0)
            c.setDash()

        # ---- hang hole guide (left, vertically centred) ----
        if SHOW_HOLE:
            hx = cell_x + pad + hole_zone / 2
            hy = cell_mid_y
            c.setStrokeColorRGB(0.55, 0.55, 0.55)
            c.setLineWidth(0.4)
            c.setDash(0.8, 0.8)
            c.circle(hx, hy, (HOLE_DIAM_MM / 2) * mm, stroke=1, fill=0)
            c.setDash()

        # ---- QR: right of hole zone, top-aligned in the QR+code column ----
        qr = make_qr(code)
        n = len(list(qr.matrix))
        qr_col_x = cell_x + pad + hole_zone
        qx = qr_col_x + QUIET_MOD * module
        # QR sits at top of its band; code goes under quiet zone
        qy = cell_top - pad - QUIET_MOD * module - n * module
        draw_qr(c, qr, qx, qy, module)

        # ---- product code centred under the QR ----
        code_max_w = qr_box
        pt = fit_font(code, CODE_FONT, CODE_PT, code_max_w)
        c.setFillColorRGB(0, 0, 0)
        c.setFont(CODE_FONT, pt)
        code_y = qy - QUIET_MOD * module - code_gap - pt * 0.75
        c.drawCentredString(qr_col_x + qr_box / 2, code_y, code)

        # ---- brand name on the right (where the code used to be) ----
        tx = qr_col_x + qr_box + QR_TEXT_GAP_MM * mm
        text_w = cell_x + cw - pad - tx
        y = cell_top - pad - BRAND_DROP_MM * mm
        if BRAND_NAME:
            bpt = fit_font(BRAND_NAME, BRAND_FONT, BRAND_PT, text_w)
            y -= bpt * 0.8
            c.setFont(BRAND_FONT, bpt)
            c.drawString(tx, y, BRAND_NAME)
        # below brand: intentionally blank (write price by hand)

    c.save()
    pages = -(-len(codes) // per_page)
    print(f"Created {OUTPUT_PDF}: {len(codes)} labels on {pages} A4 page(s) "
          f"({cols}x{rows} per page, landscape labels {CELL_W_MM}x{CELL_H_MM} mm)")
    print(f"Symbol: {QR_TYPE} QR {make_qr(codes[0]).version}, {n_modules}x{n_modules} modules, "
          f"dot = {module_mm:.2f} mm, QR = {qr_box / mm:.1f} mm incl. quiet zone")
    if module_mm < 0.8:
        print("WARNING: dots under 0.8 mm may be hard to scan - enlarge the label height.")


if __name__ == "__main__":
    main()
