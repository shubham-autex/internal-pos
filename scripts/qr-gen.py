#!/usr/bin/env python3
"""
Generate Micro QR labels (PJMS26D001 .. PJMS26D030) on an A4 PDF.

Install:  pip install segno reportlab
Run:      python generate_micro_qr.py
Print:    open the PDF and print at 100% / "Actual size" (NOT "Fit to page").
"""
import segno
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

# ---------------- SETTINGS (edit these) ----------------
PREFIX      = "PJMS26D"
START, END  = 1, 9
DIGITS      = 3                 # 001, 002 ...
OUTPUT_PDF  = "micro_qr_labels.pdf"

# ---- HOW MANY QR TO PRINT FOR EACH SERIES NUMBER ----
COPIES_PER_CODE = 9             # every code is printed this many times
COPIES_OVERRIDE = {             # optional: different count for specific codes
    # "PJMS26D005": 10,
    # "PJMS26D012": 1,
}
GROUP_COPIES = True             # True  -> 001,001,001,002,002,002 ...
                                # False -> 001,002 ... 030, then 001,002 ... 030 again

# ---- QR SIMPLICITY / SCAN SETTINGS ----
QR_TYPE         = "micro"
                                # "standard" = normal QR (every phone camera reads it, a bit denser)
ERROR_LEVEL     = "l"           # "l" = simplest pattern (best for clean printed stickers), "m" = more damage-proof
QR_DATA_WITHOUT_PREFIX = False
                                # The printed text under the QR still shows the full name.

# ---- QR SETTINGS (full product code is always encoded, nothing is trimmed) ----
USE_MICRO   = True              # True = Micro QR (smallest). False = regular QR (21x21, scans in every phone camera)
QR_ERROR    = "l"               # "l" = simplest/least dense (recommended), "m", "q" = more dense

AUTO_FIT    = True              # True = QR scales automatically to fill the cell
MODULE_MM   = 1.1               # used only when AUTO_FIT = False (size of one dot in mm)
CELL_PAD_MM = 1.0               # empty space kept inside the cell edge
TEXT_H_MM   = 4                 # space reserved at the bottom for the product name
CELL_W_MM   = 20                # label cell width  (bigger cell = bigger QR = easier scan)
CELL_H_MM   = 28                # label cell height (QR + name + price lines)
MARGIN_MM   = 10                # page margin
FONT        = "Helvetica-Bold"
FONT_PT     = 4
# ---- HAND-WRITE PRICE PLACEHOLDERS ----
SHOW_PRICE_FIELDS = True        # False = no price lines
PRICE_LABELS      = ["NOW:", "MRP:"]   # one writing line per entry (edit / add / remove)
PRICE_LINE_MM     = 4         # height of each writing line (bigger = easier to write)
PRICE_FONT_PT     = 4

CUT_LINES   = True              # light grey guide lines for cutting
# -------------------------------------------------------


QUIET_MOD = 2 if QR_TYPE == "micro" else 4     # white border required by each QR type


def make_qr(text):
    """Smallest symbol that fits the data, using the chosen type and error level."""
    data = text[len(PREFIX):] if QR_DATA_WITHOUT_PREFIX else text
    return segno.make(data, micro=(QR_TYPE == "micro"), error=ERROR_LEVEL, boost_error=False)


def draw_qr(c, qr, x, y, module):
    """Draw QR as vector squares. (x, y) = bottom-left of the symbol (no quiet zone)."""
    rows = list(qr.matrix)          # 1 = dark, 0 = light
    n = len(rows)
    c.setFillColorRGB(0, 0, 0)
    for r, row in enumerate(rows):
        for col, v in enumerate(row):
            if v:
                # slight overlap (0.02mm) avoids hairline gaps in some PDF viewers
                c.rect(x + col * module, y + (n - 1 - r) * module,
                       module + 0.02 * mm, module + 0.02 * mm, stroke=0, fill=1)
    return n


def build_label_list():
    """Return the full list of codes to print, including repeats."""
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
    n_modules = len(list(make_qr(codes[0]).matrix))
    total_mod = n_modules + 2 * QUIET_MOD          # symbol + quiet zone on all sides
    price_h_mm = PRICE_LINE_MM * len(PRICE_LABELS) if SHOW_PRICE_FIELDS else 0
    if AUTO_FIT:
        avail_w = CELL_W_MM - 2 * CELL_PAD_MM
        avail_h = CELL_H_MM - 2 * CELL_PAD_MM - TEXT_H_MM - price_h_mm
        module_mm = min(avail_w, avail_h) / total_mod
    else:
        module_mm = MODULE_MM
    module = module_mm * mm

    cols = int((page_w - 2 * mg) // cw)
    rows = int((page_h - 2 * mg) // ch)
    per_page = cols * rows

    # centre the grid on the page
    grid_w, grid_h = cols * cw, rows * ch
    x0 = (page_w - grid_w) / 2
    y0 = page_h - (page_h - grid_h) / 2     # top of grid

    c = canvas.Canvas(OUTPUT_PDF, pagesize=A4)
    c.setTitle("Micro QR Labels")

    for idx, code in enumerate(codes):
        pos = idx % per_page
        if idx and pos == 0:
            c.showPage()
        r, col = divmod(pos, cols)
        cell_x = x0 + col * cw
        cell_top = y0 - r * ch

        # cut guides
        if CUT_LINES:
            c.setStrokeColorRGB(0.75, 0.75, 0.75)
            c.setLineWidth(0.3)
            c.setDash(1.5, 1.5)
            c.rect(cell_x, cell_top - ch, cw, ch, stroke=1, fill=0)
            c.setDash()

        qr = make_qr(code)
        n = len(list(qr.matrix))
        qr_size = n * module

        # centre the QR horizontally, place near top of the cell
        qx = cell_x + (cw - qr_size) / 2
        qy = cell_top - CELL_PAD_MM * mm - QUIET_MOD * module - qr_size
        draw_qr(c, qr, qx, qy, module)

        # product name below the QR
        c.setFillColorRGB(0, 0, 0)
        c.setFont(FONT, FONT_PT)
        cell_bottom = cell_top - ch
        name_y = cell_bottom + (CELL_PAD_MM + price_h_mm) * mm + 1.5 * mm
        c.drawCentredString(cell_x + cw / 2, name_y, code)

        # blank lines to write MRP / discounted price by hand
        if SHOW_PRICE_FIELDS:
            c.setFont("Helvetica", PRICE_FONT_PT)
            c.setStrokeColorRGB(0, 0, 0)
            c.setLineWidth(0.4)
            c.setDash()
            left, right = cell_x + CELL_PAD_MM * mm + 0.5 * mm, cell_x + cw - CELL_PAD_MM * mm - 0.5 * mm
            for i, label in enumerate(PRICE_LABELS):
                line_y = cell_bottom + (CELL_PAD_MM + PRICE_LINE_MM * (len(PRICE_LABELS) - 1 - i)) * mm + 1 * mm
                c.drawString(left, line_y + 0.6 * mm, label)
                lw = c.stringWidth(label, "Helvetica", PRICE_FONT_PT)
                c.line(left + lw + 1 * mm, line_y, right, line_y)

    c.save()
    pages = -(-len(codes) // per_page)
    print(f"Created {OUTPUT_PDF}: {len(codes)} labels on {pages} A4 page(s) "
          f"({cols}x{rows} per page)")
    print(f"Symbol: {QR_TYPE} QR {make_qr(codes[0]).version}, {n_modules}x{n_modules} modules, "
          f"dot = {module_mm:.2f} mm, QR = {total_mod * module_mm:.1f} mm incl. quiet zone")
    if module_mm < 0.8:
        print("WARNING: dots under 0.8 mm may be hard to scan - enlarge the cell.")


if __name__ == "__main__":
    main()