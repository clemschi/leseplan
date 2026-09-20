# -*- coding: utf-8 -*-
"""Baut den 52-Wochen-Marathonplan als Excel-Datei.
Aufruf: python3 marathonplan/plan_bauen.py
"""
from datetime import date, timedelta
import re, os

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

START = date(2026, 9, 21)          # Montag der Woche 1
SCHRIFT = "Arial"

# ---------------------------------------------------------------- Hilfsmittel
def f(x):
    if abs(x - round(x)) < 1e-9:
        return str(int(round(x)))
    return ("%.1f" % x).replace(".", ",")

def pace_min(p):
    m, s = p.split(":")
    return int(m) + int(s) / 60

def dauer(teile):
    """geschaetzte Dauer in Minuten aus km und Pace je Teil"""
    d = 0.0
    for text, km in teile:
        m = re.search(r"@ (\d+):(\d\d)", text)
        p = int(m.group(1)) + int(m.group(2)) / 60 if m else 7.0
        d += km * p
    return d

def pe(n):                          # lockere Pace
    if n <= 4:  return "7:20"
    if n <= 8:  return "7:15"
    if n <= 16: return "7:10"
    if n <= 26: return "7:05"
    if n <= 35: return "7:00"
    if n <= 37: return "7:20"
    return "6:55"

def pl(n):                          # Pace langer Lauf
    if n <= 8:  return "7:25"
    if n <= 16: return "7:15"
    if n <= 26: return "7:10"
    if n <= 35: return "7:05"
    if n <= 37: return "7:25"
    return "7:00"

# ------------------------------------------------------------ Einheitenbauer
def L(km, n):
    return [("%s km locker @ %s" % (f(km), pe(n)), km)]

def steig(ein, reps, n):
    return [("%s km locker @ %s" % (f(ein), pe(n)), ein),
            ("%d× 100 m Steigerung @ 5:30" % reps, reps * 0.1),
            ("1 km auslaufen @ 7:30", 1.0)]

def fahrt(ein, reps, minuten, pace, trabmin, n):
    return [("%s km einlaufen @ %s" % (f(ein), pe(n)), ein),
            ("%d× %d min zügig @ %s" % (reps, minuten, pace), reps * minuten / pace_min(pace)),
            ("%d× %d min Trab @ 7:30" % (reps, trabmin), reps * trabmin / pace_min("7:30")),
            ("1 km auslaufen @ 7:30", 1.0)]

def ivl(ein, reps, dist_m, pace, trab_m, aus, n):
    return [("%s km einlaufen @ %s" % (f(ein), pe(n)), ein),
            ("%d× %d m @ %s" % (reps, dist_m, pace), reps * dist_m / 1000.0),
            ("%d× %d m Trab @ 7:30" % (reps - 1, trab_m), (reps - 1) * trab_m / 1000.0),
            ("%s km auslaufen @ 7:30" % f(aus), aus)]

def tempo(ein, km, pace, aus, n, zusatz=""):
    mitte = "%s km @ %s" % (f(km), pace)
    if zusatz:
        mitte += " (%s)" % zusatz
    return [("%s km einlaufen @ %s" % (f(ein), pe(n)), ein),
            (mitte, km),
            ("%s km auslaufen @ 7:30" % f(aus), aus)]

def lang(km, n):
    return [("%s km langer Lauf @ %s" % (f(km), pl(n)), km)]

def lang_end(ges, end, pace, n, zusatz):
    return [("%s km locker @ %s" % (f(ges - end), pl(n)), ges - end),
            ("%s km @ %s (%s)" % (f(end), pace, zusatz), end)]

# ------------------------------------------------------------------- Phasen
def phase(n):
    if n <= 8:  return "Gewöhnung"
    if n <= 16: return "Grundlage"
    if n <= 24: return "Schwelle / Halbmarathon-Aufbau"
    if n <= 26: return "Regeneration"
    if n <= 32: return "Marathonspezifisch"
    if n <= 35: return "Taper"
    if n <= 37: return "Reset"
    return "Tempoblock 5,7 km"

ENTLASTUNG = {4, 8, 12, 16, 20, 23, 30, 34, 42, 46, 51}

# ------------------------------------------------------------ Wochenprogramm
# je Woche: {'di': (Einheit, Teile), 'mi': ..., 'do': ..., 'so': ...}
W = {}

def setze(n, di, do, so, mi=None):
    W[n] = {"di": di, "mi": mi, "do": do, "so": so}

LOCK = "Locker"; IVL = "Intervall"; LANG = "Langer Lauf"; WK = "Wettkampf"; TEST = "Test"

# --- Gewöhnung -------------------------------------------------------------
setze(1,  (LOCK, L(4, 1)),  (LOCK, steig(3, 4, 1)),  (LANG, lang(6, 1)))
setze(2,  (LOCK, L(5, 2)),  (LOCK, steig(3.5, 5, 2)), (LANG, lang(7, 2)))
setze(3,  (LOCK, L(5, 3)),  (IVL,  fahrt(1.5, 5, 1, "6:10", 2, 3)), (LANG, lang(8, 3)))
setze(4,  (LOCK, L(4, 4)),  (LOCK, L(4, 4)),
          (TEST, [("1 km einlaufen @ 7:30", 1.0),
                  ("TEST 5 km locker @ 7:45 – Ziel 38:45", 5.0),
                  ("1 km auslaufen @ 7:45", 1.0)]))
setze(5,  (LOCK, L(5, 5)),  (IVL,  fahrt(1.5, 6, 1, "6:05", 2, 5)), (LANG, lang(9, 5)))
setze(6,  (LOCK, L(5, 6)),  (IVL,  fahrt(2, 6, 2, "6:00", 2, 6)),   (LANG, lang(10, 6)))
setze(7,  (LOCK, L(6, 7)),  (IVL,  fahrt(2, 6, 2, "5:55", 2, 7)),   (LANG, lang(11, 7)))
setze(8,  (LOCK, L(5, 8)),  (LOCK, L(4, 8)),
          (TEST, [("2 km einlaufen @ 7:15", 2.0),
                  ("TEST 3 km zügig @ 5:35 – Ziel 16:45", 3.0),
                  ("2 km auslaufen @ 7:30", 2.0)]))

# --- Grundlage -------------------------------------------------------------
setze(9,  (LOCK, L(6, 9)),  (IVL, ivl(1.5, 4, 1000, "5:45", 400, 1.0, 9)),  (LANG, lang(10, 9)))
setze(10, (LOCK, L(6, 10)), (IVL, ivl(1.5, 4, 1000, "5:40", 400, 1.0, 10)), (LANG, lang(11, 10)))
setze(11, (LOCK, L(6, 11)), (IVL, ivl(1.5, 2, 2000, "5:45", 600, 1.0, 11)),   (LANG, lang(12, 11)))
setze(12, (LOCK, L(5, 12)), (IVL, ivl(1.5, 3, 1000, "5:45", 400, 1.0, 12)), (LANG, lang(9, 12)))
setze(13, (LOCK, L(6, 13)), (LOCK, L(6, 13)),
          (TEST, [("2 km einlaufen @ 7:10", 2.0),
                  ("TEST 5 km zügig @ 5:45 – Ziel 28:45", 5.0),
                  ("5 km auslaufen @ 7:15", 5.0)]))
setze(14, (LOCK, L(6, 14)), (IVL, tempo(1.5, 4, "5:35", 1.5, 14, "Tempolauf")), (LANG, lang(13, 14)))
setze(15, (LOCK, L(7, 15)), (IVL, ivl(1.5, 4, 1000, "5:30", 400, 1.5, 15)),    (LANG, lang(13, 15)))
setze(16, (LOCK, L(5, 16)), (IVL, ivl(1.5, 3, 1000, "5:30", 400, 1.0, 16)),  (LANG, lang(10, 16)))

# --- Schwelle / Halbmarathon-Aufbau ---------------------------------------
setze(17, (LOCK, L(7, 17)), (IVL, tempo(1.5, 6, "5:30", 1.5, 17, "Schwelle")), (LANG, lang(13, 17)))
setze(18, (LOCK, L(7, 18)), (IVL, ivl(1.5, 5, 1000, "5:25", 400, 1.0, 18)),    (LANG, lang(14, 18)))
setze(19, (LOCK, L(7, 19)), (IVL, ivl(1.5, 2, 2500, "5:30", 800, 1.0, 19)),    (LANG, lang(16, 19)))
setze(20, (LOCK, L(6, 20)), (LOCK, L(6, 20)),
          (TEST, [("3 km einlaufen @ 7:05", 3.0),
                  ("TEST 5,7 km @ 5:15 – Ziel 29:56", 5.7),
                  ("4,3 km auslaufen @ 7:30", 4.3)]))
setze(21, (LOCK, L(7, 21)), (IVL, tempo(1.5, 5, "5:41", 1.5, 21, "HM-Pace")),
          (LANG, lang_end(17, 5, "5:41", 21, "HM-Pace")))
setze(22, (LOCK, L(6, 22)), (LOCK, L(8, 22)),
          (TEST, [("10 km locker @ 7:05", 10.0),
                  ("TEST 10 km @ 5:41 – Ziel 56:50", 10.0)]))
setze(23, (LOCK, L(6, 23)), (IVL, tempo(1.5, 3, "5:41", 1.5, 23, "HM-Pace")), (LANG, lang(14, 23)))
setze(24, (LOCK, L(5, 24)),
          (IVL, [("1 km einlaufen @ 7:05", 1.0),
                 ("3× 200 m @ 5:00", 0.6),
                 ("3× 200 m Trab @ 7:30", 0.6),
                 ("1 km auslaufen @ 7:30", 1.0)]),
          (WK, [("1,5 km einlaufen @ 7:05", 1.5),
                ("Halbmarathon Wien 21,1 km @ 5:41 – Ziel 2:00:00", 21.1),
                ("1,5 km auslaufen @ 7:30", 1.5)]))

# --- Regeneration ----------------------------------------------------------
setze(25, (LOCK, L(5, 25)), (LOCK, L(5, 25)), (LANG, lang(8, 25)))
setze(26, (LOCK, L(6, 26)), (IVL, tempo(1.5, 3, "5:41", 1.5, 26, "HM-Pace")), (LANG, lang(10, 26)))

# --- Marathonspezifisch (optional 4. Einheit Mittwoch) --------------------
setze(27, (LOCK, L(7, 27)), (IVL, tempo(2, 4, "6:24", 2, 27, "Marathon-Pace")),
          (LANG, lang_end(17, 4, "6:24", 27, "Marathon-Pace")))
setze(28, (LOCK, L(7, 28)), (IVL, ivl(1.5, 4, 1000, "5:35", 400, 1.5, 28)),
          (LANG, lang_end(21, 6, "6:24", 28, "Marathon-Pace")))
setze(29, (LOCK, L(6, 29)), (LOCK, L(6, 29)),
          (TEST, [("20 km locker @ 7:05", 20.0),
                  ("TEST 8 km @ 6:24 – Ziel 51:12", 8.0)]))
setze(30, (LOCK, L(7, 30)), (IVL, tempo(2, 5, "6:24", 2, 30, "Marathon-Pace")),
          (LANG, lang_end(15, 5, "6:24", 30, "Marathon-Pace")))
setze(31, (LOCK, L(8, 31)), (LOCK, L(8, 31)),
          (TEST, [("20 km locker @ 7:05", 20.0),
                  ("TEST 10 km @ 6:24 – Ziel 64:00", 10.0)]))
setze(32, (LOCK, L(8, 32)), (IVL, tempo(1.5, 6, "6:24", 1.5, 32, "Marathon-Pace")),
          (LANG, lang_end(22, 8, "6:24", 32, "Marathon-Pace")))

# --- Taper + Marathon ------------------------------------------------------
setze(33, (LOCK, [("7 km locker @ 6:35", 7.0)]),
          (LOCK, [("7 km locker @ 6:35", 7.0)]),
          (WK,   [("Start 13:00 Uhr, Schloss Schönbrunn Wien", 0.0),
                  ("19,33 km @ 5:44 bis zur Einholung", 19.33),
                  ("Catcher Car: Start +30 min, 12,9 → 14,5 → 16,1 km/h", 0.0)]))
setze(34, (LOCK, [("5 km locker @ 6:45", 5.0)]),
          (LOCK, [("5 km locker @ 6:45", 5.0)]),
          (LANG, [("10 km locker @ 6:55", 10.0)]))
setze(35, (LOCK, L(6, 35)),
          (IVL, tempo(1.5, 2, "6:24", 1.5, 35, "Marathon-Pace")),
          (WK, [("10 km @ 6:30 (kontrolliert anlaufen)", 10.0),
                ("22 km @ 6:24 (Marathon-Pace)", 22.0),
                ("10,2 km @ 6:24 (halten) – Ziel 4:30:00", 10.2)]))

# --- Reset -----------------------------------------------------------------
setze(36, (LOCK, L(3, 36)), (LOCK, L(3, 36)), (LANG, lang(4, 36)))
setze(37, (LOCK, L(4, 37)), (LOCK, L(5, 37)), (LANG, lang(7, 37)))

# --- Tempoblock 5,7 km -----------------------------------------------------
setze(38, (LOCK, L(6, 38)), (IVL, ivl(1.5, 6, 400, "4:45", 200, 1.5, 38)),  (LANG, lang(10, 38)))
setze(39, (LOCK, L(6, 39)), (LOCK, L(5, 39)),
          (TEST, [("3 km einlaufen @ 6:55", 3.0),
                  ("TEST 5,7 km @ 5:10 – Ziel 29:27", 5.7),
                  ("4,3 km auslaufen @ 7:30", 4.3)]))
setze(40, (LOCK, L(6, 40)), (IVL, ivl(1.5, 8, 400, "4:40", 200, 1.5, 40)),  (LANG, lang(13, 40)))
setze(41, (LOCK, L(7, 41)), (IVL, ivl(1.5, 4, 1000, "4:55", 400, 1.5, 41)),   (LANG, lang(13, 41)))
setze(42, (LOCK, L(6, 42)), (IVL, ivl(1.5, 6, 400, "4:40", 200, 1.5, 42)),  (LANG, lang(10, 42)))
setze(43, (LOCK, L(7, 43)), (IVL, ivl(1.5, 5, 1000, "4:50", 400, 1.0, 43)),   (LANG, lang(13, 43)))
setze(44, (LOCK, L(6, 44)), (LOCK, L(6, 44)),
          (TEST, [("3,5 km einlaufen @ 6:55", 3.5),
                  ("TEST 5,7 km @ 4:47 – Ziel 27:16", 5.7),
                  ("4,8 km auslaufen @ 7:30", 4.8)]))
setze(45, (LOCK, L(7, 45)), (IVL, ivl(1.5, 10, 400, "4:35", 200, 1.5, 45)),     (LANG, lang(14, 45)))
setze(46, (LOCK, L(6, 46)), (IVL, ivl(1.5, 4, 1000, "4:50", 400, 1.0, 46)), (LANG, lang(12, 46)))
setze(47, (LOCK, L(7, 47)), (IVL, ivl(1.5, 4, 1200, "4:45", 400, 1.0, 47)),     (LANG, lang(14, 47)))
setze(48, (LOCK, L(8, 48)), (IVL, ivl(1.5, 12, 400, "4:30", 200, 1.5, 48)),     (LANG, lang(14, 48)))
setze(49, (LOCK, L(6, 49)), (LOCK, L(6, 49)),
          (TEST, [("3,5 km einlaufen @ 6:55", 3.5),
                  ("TEST 5,7 km @ 4:40 – Ziel 26:38", 5.7),
                  ("4,8 km auslaufen @ 7:30", 4.8)]))
setze(50, (LOCK, L(7, 50)), (IVL, ivl(1.5, 5, 1000, "4:45", 400, 1.0, 50)),     (LANG, lang(14, 50)))
setze(51, (LOCK, L(6, 51)), (IVL, ivl(1.5, 8, 400, "4:30", 200, 1.5, 51)),      (LANG, lang(10, 51)))
setze(52, (LOCK, L(5, 52)),
          (LOCK, [("3 km locker @ 6:55", 3.0),
                  ("4× 100 m Steigerung @ 4:30", 0.4)]),
          (WK, [("2 km einlaufen @ 6:55", 2.0),
                ("4× 100 m Steigerung @ 4:30", 0.4),
                ("5,7 km Wettkampf Salzburg @ 4:34 – Ziel 26:00", 5.7),
                ("2 km auslaufen @ 7:30", 2.0)]))

# ------------------------------------------------------------- Ernährung
def vorher(einheit, teile, n):
    d = dauer(teile)
    if d == 0:
        return []
    gross = d >= 75 or (einheit in (IVL, WK, TEST, LANG) and d >= 50)
    if gross:
        return ["Haferflocken 80 g (2–3 h vorher)", "Banane 120 g", "Datteln 40 g", "Wasser 500 ml"]
    return ["Banane 120 g (1,5 h vorher)", "Maiswaffel 2 Stück (14 g)", "Wasser 300 ml", ""]

def waehrend(einheit, teile, n):
    d = dauer(teile)
    if d == 0:
        return []
    if d < 75:
        return ["Wasser 400 ml", "", ""]
    if n == 35 and einheit == WK:
        gel = "Gel 30 g KH alle 20 min (90 g KH/h)"
    elif n >= 27:
        gel = "Gel 25 g KH alle 20 min (75 g KH/h)"
    else:
        gel = "Gel 30 g KH alle 30 min (60 g KH/h)"
    zeilen = [gel]
    if einheit in (LANG, TEST, WK):
        zeilen.append("Elektrolytgetränk 500 ml/h (Natrium)")
    zeilen.append("Wasser 300 ml/h")
    while len(zeilen) < 3:
        zeilen.append("")
    return zeilen

def danach(einheit, teile, n):
    d = dauer(teile)
    if d == 0:
        return []
    gross = d >= 75 or (einheit in (IVL, WK, TEST, LANG) and d >= 50)
    if gross:
        return ["Clear Protein 40 g in 500 ml Wasser", "Banane 2 Stück (240 g)",
                "Maiswaffel 4 Stück (28 g)", "Datteln 20 g"]
    return ["Clear Protein 30 g in 400 ml Wasser", "Banane 1 Stück (120 g)",
            "Reiswaffel 3 Stück (27 g)", ""]

def supps(tag, n, leer):
    if leer:
        return []
    z = ["B12 250 µg"]
    if tag.month in (10, 11, 12, 1, 2, 3, 4):
        z.append("Vitamin D3 2.000 IE")
    if n >= 27:
        z += ["Omega-3 (Algenöl) 400 mg", "Calcium 500 mg", "Magnesium 200 mg"]
    while len(z) < 5:
        z.append("")
    return z

def tagesbedarf(n):
    if 27 <= n <= 35:
        return "Tagesbedarf: 460–540 g KH / 155 g Eiweiß"
    return "Tagesbedarf: 385 g KH / 140 g Eiweiß"

# ------------------------------------------------------------------ Stil
DUENN = Side(style="thin", color="8C8C8C")
DICK  = Side(style="medium", color="404040")
KEIN  = Side(style=None)

FILL_KOPF  = PatternFill("solid", fgColor="D9D9D9")
FILL_LABEL = PatternFill("solid", fgColor="F2F2F2")
FILL_EIN   = PatternFill("solid", fgColor="FFF2CC")
FILL_TITEL = PatternFill("solid", fgColor="BFBFBF")
FILL_TEST  = PatternFill("solid", fgColor="E2EFDA")

def setz(ws, zelle, wert, fett=False, groesse=10, fill=None, ausr="left", fmt=None):
    c = ws[zelle]
    c.value = wert
    c.font = Font(name=SCHRIFT, size=groesse, bold=fett)
    c.alignment = Alignment(horizontal=ausr, vertical="center", wrap_text=False)
    if fill:
        c.fill = fill
    if fmt:
        c.number_format = fmt
    return c

def rahmen(ws, zeile, spalten, oben, unten, aussen_links, aussen_rechts):
    for i, sp in enumerate(spalten):
        c = ws["%s%d" % (sp, zeile)]
        links  = DICK if (i == 0 and aussen_links) else DUENN
        rechts = DICK if (i == len(spalten) - 1 and aussen_rechts) else DUENN
        c.border = Border(top=oben, bottom=unten, left=links, right=rechts)

# --------------------------------------------------------------- Aufbau
wb = Workbook()

# ============================================================ Blatt 1
ws = wb.active
ws.title = "Ziele & Tests"
ws.sheet_view.showGridLines = False
ws.column_dimensions["A"].width = 22
for i in range(2, 12):
    ws.column_dimensions[get_column_letter(i)].width = 23

r = 1
setz(ws, "A1", "Marathonplan 21.09.2026 – 16.09.2027 · 52 Wochen · 3 Laufeinheiten/Woche",
     fett=True, groesse=12)
ws.merge_cells("A1:K1")
r = 3

# --- Ziele -----------------------------------------------------------------
ZIELE_SP = ["A", "B", "C", "D", "E"]
setz(ws, "A%d" % r, "Ziele", fett=True, groesse=11, fill=FILL_TITEL)
ws.merge_cells("A%d:E%d" % (r, r))
rahmen(ws, r, ZIELE_SP, DICK, DUENN, True, True)
r += 1
ziele_kopf = ["Merkmal", "Halbmarathon", "Wings for Life", "Marathon", "5,7 km"]
for i, t in enumerate(ziele_kopf):
    setz(ws, "%s%d" % (get_column_letter(i + 1), r), t, fett=True, fill=FILL_KOPF,
         ausr="left" if i == 0 else "center")
rahmen(ws, r, ZIELE_SP, DUENN, DUENN, True, True)
r += 1
ziele_zeilen = [
    ("Datum",             "07.03.2027", "09.05.2027",        "23.05.2027", "16.09.2027"),
    ("Ort",               "Wien",       "Wien",              "Salzburg",   "Salzburg"),
    ("Woche",             "Woche 24",   "Woche 33",          "Woche 35",   "Woche 52"),
    ("Ziel (Traumziel)",  "1:44:59",    "bis zur Einholung", "3:59:59",    "24:59"),
    ("Ziel-Pace",         "4:58/km",    "5:44/km",           "5:41/km",    "4:23/km"),
    ("Einschätzung",      "2:00:00",    "19,33 km",          "4:30:00",    "26:00"),
    ("Einschätzung-Pace", "5:41/km",    "5:44/km",           "6:24/km",    "4:34/km"),
    ("Ist-Zeit",          "",           "",                  "",           ""),
]
for j, zl in enumerate(ziele_zeilen):
    for i, t in enumerate(zl):
        ist = zl[0] == "Ist-Zeit" and i > 0
        setz(ws, "%s%d" % (get_column_letter(i + 1), r), t,
             fett=(i == 0), fill=FILL_LABEL if i == 0 else (FILL_EIN if ist else None),
             ausr="left" if i == 0 else "center")
    rahmen(ws, r, ZIELE_SP, DUENN,
           DICK if j == len(ziele_zeilen) - 1 else DUENN, True, True)
    r += 1

r += 1
setz(ws, "A%d" % r, "Einschätzung Marathon 4:30:00: 4:15 wäre nur bei erfahrenen Läufern mit hohem "
                    "Umfang realistisch; bei Erstmarathon mit 3 Trainingstagen/Woche liegt der "
                    "Umrechnungsfaktor HM→Marathon eher bei 2,2–2,3 statt 2,1.", groesse=9)
ws.merge_cells("A%d:K%d" % (r, r))
r += 1
setz(ws, "A%d" % r, "Wings for Life World Run: Start 13:00 Uhr bei Schloss Schönbrunn; das Catcher "
                    "Car startet 30 Minuten später mit 12,9 → 14,5 → 16,1 km/h. Bei 5:44/km liegt "
                    "die Einholung rechnerisch bei rund 19,33 km.", groesse=9)
ws.merge_cells("A%d:K%d" % (r, r))
r += 2

# --- Tests -----------------------------------------------------------------
TESTS = [
    ("Woche 4",  "18.10.2026", "5 km locker @ 7:45",   "—",                 "5 km",   "38:45"),
    ("Woche 8",  "15.11.2026", "3 km zügig @ 5:35",    "—",                 "3 km",   "16:45"),
    ("Woche 13", "20.12.2026", "5 km zügig @ 5:45",    "—",                 "5 km",   "28:45"),
    ("Woche 20", "07.02.2027", "5,7 km Test @ 5:15",   "—",                 "5,7 km", "29:56 (5:15/km)"),
    ("Woche 22", "21.02.2027", "10 km locker @ 7:05",  "10 km @ 5:41",      "20 km",  "10-km-Teil in 56:50"),
    ("Woche 29", "11.04.2027", "20 km locker @ 7:05",  "8 km @ 6:24",       "28 km",  "8-km-Teil in 51:12"),
    ("Woche 31", "25.04.2027", "20 km locker @ 7:05",  "10 km @ 6:24",      "30 km",  "10-km-Teil in 64:00"),
    ("Woche 39", "20.06.2027", "5,7 km Test @ 5:10",   "—",                 "5,7 km", "29:27"),
    ("Woche 44", "25.07.2027", "5,7 km Test @ 4:47",   "—",                 "5,7 km", "27:16 (4:47/km)"),
    ("Woche 49", "29.08.2027", "5,7 km Test @ 4:40",   "—",                 "5,7 km", "26:38 (4:40/km)"),
]
sp_test = [get_column_letter(i) for i in range(1, 12)]
setz(ws, "A%d" % r, "Tests", fett=True, groesse=11, fill=FILL_TITEL)
ws.merge_cells("A%d:K%d" % (r, r))
rahmen(ws, r, sp_test, DICK, DUENN, True, True)
r += 1
setz(ws, "A%d" % r, "Merkmal", fett=True, fill=FILL_KOPF)
for i in range(10):
    setz(ws, "%s%d" % (get_column_letter(i + 2), r), "Test %d" % (i + 1),
         fett=True, fill=FILL_KOPF, ausr="center")
rahmen(ws, r, sp_test, DUENN, DUENN, True, True)
r += 1
test_zeilen = ["Woche", "Datum", "Teil 1", "Teil 2", "Gesamt", "Zielwert", "Ist-Zeit", "Gefühl"]
for j, name in enumerate(test_zeilen):
    setz(ws, "A%d" % r, name, fett=True, fill=FILL_LABEL)
    for i, t in enumerate(TESTS):
        wert = t[j] if j < 6 else ""
        setz(ws, "%s%d" % (get_column_letter(i + 2), r), wert,
             fill=FILL_EIN if j >= 6 else None, ausr="center" if j < 2 or j == 4 else "left")
    rahmen(ws, r, sp_test, DUENN, DICK if j == len(test_zeilen) - 1 else DUENN, True, True)
    r += 1

r += 1
setz(ws, "A%d" % r, "Hinweise", fett=True, groesse=11, fill=FILL_TITEL)
ws.merge_cells("A%d:K%d" % (r, r))
rahmen(ws, r, sp_test, DICK, DUENN, True, True)
r += 1
HINWEISE = [
    "Lauftage: Montag kurz · Mittwoch kurz + Qualität · Freitag langer Lauf · Sa/So frei.",
    "Wettkämpfe und Tests stehen an ihrem festen Datum in der Spalte Wettkampf/Test und "
    "ersetzen in dieser Woche den Freitagslauf.",
    "Blutwerte (Ferritin, B12, Vitamin D) vor Trainingsbeginn ärztlich checken lassen.",
    "Dieser Plan ist kein Ersatz für ärztlichen Rat.",
    "Gelb hinterlegte Zellen sind zum Eintragen: Ist-Zeit und Gefühl.",
    "Beispiel Ist-Zeit: 28:32 · Beispiel Gefühl: locker, Beine ab km 8 schwer",
    "Traumziele bleiben als Anzeige stehen; das Training ist auf die Einschätzung kalibriert.",
    "Supplements stehen ausschließlich in der Zeile Supplements, nicht bei den Lebensmitteln.",
]
for j, h in enumerate(HINWEISE):
    setz(ws, "A%d" % r, h, groesse=9)
    ws.merge_cells("A%d:K%d" % (r, r))
    rahmen(ws, r, sp_test, DUENN, DICK if j == len(HINWEISE) - 1 else DUENN, True, True)
    r += 1

ws.freeze_panes = "B2"

# ============================================================ Wochenblätter
# Lauftage: Montag kurz, Mittwoch kurz + Qualität, Freitag langer Lauf.
# Wettkämpfe und Tests stehen an ihrem festen Datum in einer eigenen Spalte.
EVENT_OFFSET = {52: 3}          # Woche 52: Donnerstag, sonst Sonntag
WOCHENTAG = {0: "Montag", 2: "Mittwoch", 3: "Donnerstag", 4: "Freitag", 6: "Sonntag"}

KOPFNOTIZ = {
    33: "Qualitätseinheit (3× 10 min @ 6:02) entfällt ersatzlos · nach dem Wettkampf "
        "Essen nicht reduzieren",
    34: "reduziert als Ausgleich für Woche 33 · gestrichen: 5× 3 min @ 6:02 und 4 km "
        "vom langen Lauf · nach dem langen Lauf viel Schlaf",
}

ESSEN_SPEZIAL = {
    (33, "mo"): (["Haferflocken 60 g (2 h vorher)", "Banane 120 g", "Wasser 400 ml", ""],
                 ["Wasser 400 ml", "", ""],
                 ["Clear Protein 30 g in 400 ml Wasser", "Banane 1 Stück (120 g)",
                  "Reiswaffel 3 Stück (27 g)", ""]),
    (33, "wk"): (["Haferflocken 80 g (3 h vorher)", "Banane 120 g", "Datteln 40 g",
                  "Wasser 500 ml"],
                 ["Gel 30 g KH alle 30 min (60 g KH/h)",
                  "Elektrolytgetränk 500 ml/h (Natrium)", "Wasser 300 ml/h"],
                 ["Clear Protein 40 g in 500 ml Wasser", "Banane 2 Stück (240 g)",
                  "Maiswaffel 4 Stück (28 g)", "Datteln 20 g"]),
}
ESSEN_SPEZIAL[(33, "mi")] = ESSEN_SPEZIAL[(33, "mo")]

def wochen_tage(n):
    """[(Spaltenkopf-Name, Tagesversatz, Tagdaten, Schluessel)] in Spaltenreihenfolge"""
    kurz1, kurz2, lang = W[n]["di"], W[n]["do"], W[n]["so"]
    ereignis = None
    if kurz2 and kurz2[0] in (TEST, WK):
        ereignis, kurz2 = kurz2, None
    elif lang and lang[0] in (TEST, WK):
        ereignis, lang = lang, None
    return [("Montag", 0, kurz1, "mo"), ("Mittwoch", 2, kurz2, "mi"),
            ("Freitag", 4, lang, "fr"),
            ("Wettkampf / Test", EVENT_OFFSET.get(n, 6), ereignis, "wk")]
SPALTEN = ["A", "B", "C", "D", "E"]
TESTWOCHEN = {4: "18.10.26", 8: "15.11.26", 13: "20.12.26", 20: "07.02.27", 22: "21.02.27",
              29: "11.04.27", 31: "25.04.27", 39: "20.06.27", 44: "25.07.27", 49: "29.08.27"}

def dstr(d):
    return "%02d.%02d." % (d.day, d.month)

for n in range(1, 53):
    mo = START + timedelta(days=7 * (n - 1))
    so = mo + timedelta(days=6)
    blatt = wb.create_sheet("W%02d" % n)
    blatt.sheet_view.showGridLines = False
    blatt.column_dimensions["A"].width = 17
    for sp in SPALTEN[1:]:
        blatt.column_dimensions[sp].width = 42

    titel = "Woche %d · Mo %s – So %s%d · %s" % (n, dstr(mo), dstr(so), so.year, phase(n))
    if n in ENTLASTUNG:
        titel += " · Entlastungswoche"
    if n in TESTWOCHEN:
        titel += " · Test %s" % TESTWOCHEN[n]
    if n == 24:
        titel += " · Wettkampf Halbmarathon Wien"
    if n == 35:
        titel += " · Wettkampf Marathon Salzburg"
    if n == 33:
        titel += " · Wettkampf Wings for Life World Run Wien"
    if n == 52:
        titel += " · Wettkampf 5,7 km Salzburg"
    setz(blatt, "A1", titel, fett=True, groesse=12, fill=FILL_TITEL)
    blatt.merge_cells("A1:E1")
    rahmen(blatt, 1, SPALTEN, DICK, DUENN, True, True)

    # Zeile 2: Wochenumfang (Formel) + Tagesbedarf
    setz(blatt, "A2", "Wochenumfang", fett=True, fill=FILL_LABEL)
    setz(blatt, "B2", "=SUM(B5:E5)", fett=True, ausr="center", fmt='0.0" km"')
    info = tagesbedarf(n)
    if n in KOPFNOTIZ:
        info += " · " + KOPFNOTIZ[n]
    if n == 35:
        mi_tag = mo + timedelta(days=2)
        sa_tag = mo + timedelta(days=5)
        info += " · Carboloading Mi %s – Sa %s: 620–690 g KH / 120 g Eiweiß" % (dstr(mi_tag), dstr(sa_tag))
    setz(blatt, "C2", info, groesse=9)
    blatt.merge_cells("C2:E2")
    rahmen(blatt, 2, SPALTEN, DUENN, DICK, True, True)

    # Zeile 3: Kopfzeile Tage
    tage = wochen_tage(n)
    setz(blatt, "A3", "Merkmal", fett=True, fill=FILL_KOPF)
    for i, (name, off, tagdaten, key) in enumerate(tage):
        tag = mo + timedelta(days=off)
        if key == "wk":
            kopf = ("%s %s · Wettkampf/Test" % (WOCHENTAG[off], dstr(tag))) if tagdaten \
                   else "Wettkampf / Test (keiner)"
        else:
            kopf = "%s %s" % (name, dstr(tag))
        setz(blatt, "%s3" % SPALTEN[i + 1], kopf, fett=True, fill=FILL_KOPF, ausr="center")
    rahmen(blatt, 3, SPALTEN, DUENN, DUENN, True, True)

    # Zeile 4/5: Einheit, Umfang
    setz(blatt, "A4", "Einheit", fett=True, fill=FILL_LABEL)
    setz(blatt, "A5", "Umfang", fett=True, fill=FILL_LABEL)
    for i, (name, off, tagdaten, key) in enumerate(tage):
        sp = SPALTEN[i + 1]
        if not tagdaten:
            setz(blatt, "%s4" % sp, "—", ausr="center")
            setz(blatt, "%s5" % sp, "—", ausr="center")
            continue
        einheit, teile = tagdaten
        km = round(sum(x[1] for x in teile), 1)
        setz(blatt, "%s4" % sp, einheit, fett=True, ausr="center",
             fill=FILL_TEST if einheit in (TEST, WK) else None)
        if km > 0:
            setz(blatt, "%s5" % sp, km, ausr="center", fmt='0.0" km"')
        else:
            setz(blatt, "%s5" % sp, "—", ausr="center")
    rahmen(blatt, 4, SPALTEN, DUENN, DUENN, True, True)
    rahmen(blatt, 5, SPALTEN, DUENN, DUENN, True, True)

    # Zeilen 6-9: Teil 1-4
    for t in range(4):
        z = 6 + t
        setz(blatt, "A%d" % z, "Teil %d" % (t + 1), fett=True, fill=FILL_LABEL)
        for i, (name, off, tagdaten, key) in enumerate(tage):
            sp = SPALTEN[i + 1]
            teile = tagdaten[1] if tagdaten else []
            setz(blatt, "%s%d" % (sp, z), teile[t][0] if t < len(teile) else "—")
        rahmen(blatt, z, SPALTEN, DUENN, DUENN, True, True)

    # Blöcke: Vorher (10-13), Während (14-16), Danach (17-20), Supplements (21-25)
    bloecke = [("Vorher", 10, 4, vorher), ("Während", 14, 3, waehrend),
               ("Danach", 17, 4, danach), ("Supplements", 21, 5, None)]
    for name, start_z, hoehe, fn in bloecke:
        blatt.merge_cells("A%d:A%d" % (start_z, start_z + hoehe - 1))
        setz(blatt, "A%d" % start_z, name, fett=True, fill=FILL_LABEL)
        blatt["A%d" % start_z].alignment = Alignment(horizontal="left", vertical="center")
        for i, (tname, off, tagdaten, key) in enumerate(tage):
            sp = SPALTEN[i + 1]
            if not tagdaten:
                zeilen = []
            elif name == "Supplements":
                einheit, teile = tagdaten
                zeilen = supps(mo + timedelta(days=off), n, dauer(teile) == 0)
            elif (n, key) in ESSEN_SPEZIAL:
                zeilen = ESSEN_SPEZIAL[(n, key)][["Vorher", "Während", "Danach"].index(name)]
            else:
                einheit, teile = tagdaten
                zeilen = fn(einheit, teile, n)
            for k in range(hoehe):
                setz(blatt, "%s%d" % (sp, start_z + k), zeilen[k] if k < len(zeilen) else
                     ("—" if k == 0 else ""))
        for k in range(hoehe):
            z = start_z + k
            oben  = DUENN if k == 0 else KEIN
            unten = DUENN if k == hoehe - 1 else KEIN
            for i, sp in enumerate(SPALTEN):
                c = blatt["%s%d" % (sp, z)]
                links  = DICK if i == 0 else DUENN
                rechts = DICK if i == len(SPALTEN) - 1 else DUENN
                if sp == "A":
                    c.border = Border(top=DUENN if k == 0 else KEIN,
                                      bottom=DUENN if k == hoehe - 1 else KEIN,
                                      left=DICK, right=DUENN)
                else:
                    c.border = Border(top=oben, bottom=unten, left=links, right=rechts)

    # Zeilen 26/27: Ist-Zeit, Gefühl
    for k, name in enumerate(["Ist-Zeit", "Gefühl"]):
        z = 26 + k
        setz(blatt, "A%d" % z, name, fett=True, fill=FILL_LABEL)
        for i in range(4):
            setz(blatt, "%s%d" % (SPALTEN[i + 1], z), "", fill=FILL_EIN)
        rahmen(blatt, z, SPALTEN, DUENN, DICK if k == 1 else DUENN, True, True)

    for z in range(1, 28):
        blatt.row_dimensions[z].height = 15.5
    blatt.row_dimensions[1].height = 20
    blatt.freeze_panes = "B4"

# Excel rechnet die Wochensummen beim Oeffnen nach
wb.calculation.fullCalcOnLoad = True

ziel = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Marathonplan_2026_2027.xlsx")
wb.save(ziel)

# ---------------------------------------------------- Baustein für mylife
# Dieselben Daten noch einmal als src/js/laufen-plan.js. Die Ernährung steht
# dort als Kürzel; die Zeilen dazu stehen einmal in laufen.js.
import json

def essen_code(einheit, teile, n, key):
    d = dauer(teile)
    if d == 0:
        return ("", "", "")
    if (n, key) in ESSEN_SPEZIAL:
        v = "w33kurz" if key in ("mo", "mi") else "w33wk"
        w = "wasser" if key in ("mo", "mi") else "gel60lang"
        na = "klein" if key in ("mo", "mi") else "gross"
    else:
        v = "gross" if (d >= 75 or (einheit in (IVL, WK, TEST, LANG) and d >= 50)) else "klein"
        if d < 75:
            w = "wasser"
        elif n == 35 and einheit == WK:
            w = "gel90lang"
        elif n >= 27:
            w = "gel75lang" if einheit in (LANG, TEST, WK) else "gel75"
        else:
            w = "gel60lang" if einheit in (LANG, TEST, WK) else "gel60"
        na = "gross" if (d >= 75 or (einheit in (IVL, WK, TEST, LANG) and d >= 50)) else "klein"
    return (v, w, na)

def supp_code(tag, n):
    d3 = tag.month in (10, 11, 12, 1, 2, 3, 4)
    om = n >= 27
    return {(0, 0): "a", (1, 0): "b", (0, 1): "c", (1, 1): "d"}[(int(d3), int(om))]

wochen_js = []
for n in range(1, 53):
    mo_tag = START + timedelta(days=7 * (n - 1))
    eintrag = {"n": n, "p": phase(n), "e": 1 if n in ENTLASTUNG else 0,
               "b": 1 if 27 <= n <= 35 else 0, "t": []}
    if n in KOPFNOTIZ:
        eintrag["hinweis"] = KOPFNOTIZ[n]
    for name, off, tagdaten, key in wochen_tage(n):
        tag = mo_tag + timedelta(days=off)
        if not tagdaten:
            eintrag["t"].append(None)
            continue
        einheit, teile = tagdaten
        v, w, na = essen_code(einheit, teile, n, key)
        eintrag["t"].append({
            "d": WOCHENTAG[off] if key == "wk" else name,
            "o": off, "E": einheit,
            "T": [[t[0], round(t[1], 2)] for t in teile],
            "k": key, "v": v, "w": w, "na": na, "s": supp_code(tag, n)})
    wochen_js.append(eintrag)

rennen_js = [{"name": ziele_kopf[i + 1], **{k: zl[i + 1] for k, zl in
              zip(["datum", "ort", "woche", "traum", "traumPace", "ziel", "zielPace"],
                  ziele_zeilen[:7])}} for i in range(len(ziele_kopf) - 1)]
tests_js = [{"woche": t[0], "datum": t[1], "teil1": t[2], "teil2": t[3],
             "gesamt": t[4], "ziel": t[5]} for t in TESTS]

js = "/* ============================================================\n"
js += "   Laufen - der Plan als Daten. Erzeugt aus marathonplan/plan_bauen.py,\n"
js += "   nicht von Hand bearbeiten. Die Ernaehrungskuerzel loest laufen.js auf.\n"
js += "   ============================================================ */\n"
js += "const LPLAN = {\n"
js += '  start: "2026-09-21",\n'
js += "  rennen: " + json.dumps(rennen_js, ensure_ascii=False) + ",\n"
js += "  tests: " + json.dumps(tests_js, ensure_ascii=False) + ",\n"
js += "  strecken: [\n"
js += '    { name: "daheim \u2192 Eltern", km: 5.7, art: "einfach" },\n'
js += '    { name: "Sacher \u2192 Urstein", km: 10, art: "einfach" },\n'
js += '    { name: "Sacher \u2192 Laufen", km: 21, art: "einfach" },\n'
js += '    { name: "Sacher \u2192 Laufen \u2192 Sacher", km: 42, art: "hin und zur\u00fcck" }\n'
js += "  ],\n"
js += "  wochen: [\n"
js += ",\n".join("    " + json.dumps(w, ensure_ascii=False) for w in wochen_js)
js += "\n  ]\n};\n"

js_ziel = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                       "src", "js", "laufen-plan.js")
open(js_ziel, "w", encoding="utf-8").write(js)
print("geschrieben:", js_ziel, len(js), "Zeichen")

# Kontrollausgabe der Wochenumfänge
print("Woche  3-Tage   gesamt   Phase")
for n in range(1, 53):
    drei = sum(x[1] for k in ("di", "do", "so") for x in (W[n][k][1] if W[n][k] else []))
    ges = drei + sum(x[1] for x in (W[n]["mi"][1] if W[n]["mi"] else []))
    print("%5d  %6.1f   %6.1f   %s" % (n, drei, ges, phase(n)))
print("gespeichert:", ziel)
