"""Generate the padel Elo workbook as a .xlsx file.

This script builds a minimal Excel workbook using only the Python
standard library. The output file is an OpenXML zip package, which is
how modern .xlsx files are structured.
"""

from __future__ import annotations

import argparse
import zipfile
from pathlib import Path
from xml.dom import minidom
from xml.etree.ElementTree import Element, SubElement, tostring


HEADERS = [
    "id",
    "created_at",
    "team1",
    "team2",
    "team1_sets",
    "team2_sets",
    "team1_ids",
    "team2_ids",
    "created_by",
    "team1_serves_first",
    "score_type",
    "score_target",
    "source_tournament_id",
    "source_tournament_type",
    "team1_score",
    "team2_score",
    "team1_expected",
    "team2_expected",
    "team1_delta",
    "team2_delta",
    "player1_delta",
    "player2_delta",
    "player3_delta",
    "player4_delta",
]

STANDINGS_HEADERS = ["player_id", "final_elo", "matches_played", "wins", "losses"]

CONFIG_CELLS = {
    "A1": "K (Elo K-factor)",
    "B1": 32,
    "A2": "Starting Elo",
    "B2": 1500,
    "A3": "Team Elo aggregation",
    "B3": "Average",
    "A4": "Split method",
    "B4": "Equal split",
    "D1": "Notes",
    "D2": (
        "Raw Match Data formulas compute expected scores using current player ratings, "
        "which are derived from the Starting Elo plus prior match deltas."
    ),
    "D3": (
        "Team deltas are split evenly across both team members, so each player gets half of "
        "the team change for a match."
    ),
}


def join_formula(parts: list[str]) -> str:
    """Join Excel formula snippets into a single formula string.

    This keeps long formulas readable in Python while still producing a
    single Excel formula in the output file.
    """

    return "".join(parts)


def col_letter(col_index: int) -> str:
    """Convert a 1-based column index into Excel-style column letters."""

    result = ""
    while col_index > 0:
        col_index, remainder = divmod(col_index - 1, 26)
        result = chr(65 + remainder) + result
    return result


def prettify(element: Element) -> str:
    """Pretty-print XML for readability in the generated file."""

    raw = tostring(element, encoding="utf-8")
    return minidom.parseString(raw).toprettyxml(indent="  ")


def make_cell(ref: str, value: str | int | float | None = None, *, formula: str | None = None) -> Element:
    """Create an Excel cell XML element.

    If a formula is provided, Excel will calculate the value for us when
    the workbook is opened.
    """

    cell = Element("c", r=ref)
    if formula is not None:
        formula_elem = SubElement(cell, "f")
        formula_elem.text = formula
        return cell

    if isinstance(value, str):
        cell.set("t", "inlineStr")
        is_elem = SubElement(cell, "is")
        t_elem = SubElement(is_elem, "t")
        t_elem.text = value
        return cell

    if value is not None:
        value_elem = SubElement(cell, "v")
        value_elem.text = str(value)

    return cell


def make_sheet(rows: list[tuple[int, list[Element]]]) -> str:
    """Build a worksheet XML string from row and cell definitions."""

    worksheet = Element("worksheet", xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main")
    sheet_data = SubElement(worksheet, "sheetData")

    for row_index, cells in rows:
        row_elem = SubElement(sheet_data, "row", r=str(row_index))
        for cell in cells:
            row_elem.append(cell)

    return prettify(worksheet)


def build_raw_match_data_sheet() -> str:
    """Create the Raw Match Data worksheet XML.

    The first row is the header row. The second row includes example
    formulas that can be filled down by the user for new matches.
    """

    raw_formulas = {
        15: "IF(E2>F2,1,IF(E2<F2,0,0.5))",
        16: "IF(E2>F2,0,IF(E2<F2,1,0.5))",
        17: join_formula(
            [
                "LET(",
                "ids1,TEXTSPLIT($G2,\",\"),",
                "ids2,TEXTSPLIT($H2,\",\"),",
                "p1,INDEX(ids1,1),",
                "p2,INDEX(ids1,2),",
                "p3,INDEX(ids2,1),",
                "p4,INDEX(ids2,2),",
                "start,Config!$B$2,",
                "rowNum,ROW(),",
                "team1DeltaRange,$S$2:$S$1000,",
                "team2DeltaRange,$T$2:$T$1000,",
                "team1IdsRange,$G$2:$G$1000,",
                "team2IdsRange,$H$2:$H$1000,",
                "rowRange,ROW($S$2:$S$1000),",
                "p1Delta,SUMPRODUCT((rowRange<rowNum)*ISNUMBER(SEARCH(p1,team1IdsRange))*(team1DeltaRange/2))",
                "+SUMPRODUCT((rowRange<rowNum)*ISNUMBER(SEARCH(p1,team2IdsRange))*(team2DeltaRange/2)),",
                "p2Delta,SUMPRODUCT((rowRange<rowNum)*ISNUMBER(SEARCH(p2,team1IdsRange))*(team1DeltaRange/2))",
                "+SUMPRODUCT((rowRange<rowNum)*ISNUMBER(SEARCH(p2,team2IdsRange))*(team2DeltaRange/2)),",
                "p3Delta,SUMPRODUCT((rowRange<rowNum)*ISNUMBER(SEARCH(p3,team1IdsRange))*(team1DeltaRange/2))",
                "+SUMPRODUCT((rowRange<rowNum)*ISNUMBER(SEARCH(p3,team2IdsRange))*(team2DeltaRange/2)),",
                "p4Delta,SUMPRODUCT((rowRange<rowNum)*ISNUMBER(SEARCH(p4,team1IdsRange))*(team1DeltaRange/2))",
                "+SUMPRODUCT((rowRange<rowNum)*ISNUMBER(SEARCH(p4,team2IdsRange))*(team2DeltaRange/2)),",
                "p1Rating,start+p1Delta,",
                "p2Rating,start+p2Delta,",
                "p3Rating,start+p3Delta,",
                "p4Rating,start+p4Delta,",
                "team1Elo,AVERAGE(p1Rating,p2Rating),",
                "team2Elo,AVERAGE(p3Rating,p4Rating),",
                "1/(1+10^((team2Elo-team1Elo)/400))",
                ")",
            ]
        ),
        18: "1-Q2",
        19: "Config!$B$1*(O2-Q2)",
        20: "Config!$B$1*(P2-R2)",
        21: "IF($G2<>\"\",$S2/2,\"\")",
        22: "IF($G2<>\"\",$S2/2,\"\")",
        23: "IF($H2<>\"\",$T2/2,\"\")",
        24: "IF($H2<>\"\",$T2/2,\"\")",
    }

    row1_cells = [make_cell(f"{col_letter(idx)}1", header) for idx, header in enumerate(HEADERS, 1)]

    row2_cells = [
        make_cell(f"{col_letter(idx)}2", formula=formula)
        for idx, formula in raw_formulas.items()
    ]

    return make_sheet([(1, row1_cells), (2, row2_cells)])


def build_config_sheet() -> str:
    """Create the Config worksheet XML."""

    rows = []
    row_map: dict[int, list[Element]] = {}
    for ref, value in CONFIG_CELLS.items():
        row_num = int("".join(filter(str.isdigit, ref)))
        row_map.setdefault(row_num, []).append(make_cell(ref, value))

    for row_num in sorted(row_map.keys()):
        rows.append((row_num, row_map[row_num]))

    return make_sheet(rows)


def build_standings_sheet() -> str:
    """Create the Standings worksheet XML."""

    standings_formulas = {
        "A2": join_formula(
            [
                "LET(",
                "allIds,TOCOL(TEXTSPLIT(TEXTJOIN(\",\",TRUE,'Raw Match Data'!G2:G1000&\",\"&'Raw Match Data'!H2:H1000),\",\"),1),",
                "uniqueIds,UNIQUE(FILTER(TRIM(allIds),TRIM(allIds)<>\"\")),",
                "uniqueIds",
                ")",
            ]
        ),
        "B2": join_formula(
            [
                "LET(",
                "id,A2,",
                "start,Config!$B$2,",
                "team1DeltaRange,'Raw Match Data'!$S$2:$S$1000,",
                "team2DeltaRange,'Raw Match Data'!$T$2:$T$1000,",
                "team1IdsRange,'Raw Match Data'!$G$2:$G$1000,",
                "team2IdsRange,'Raw Match Data'!$H$2:$H$1000,",
                "sumDelta,SUMPRODUCT(ISNUMBER(SEARCH(id,team1IdsRange))*(team1DeltaRange/2))",
                "+SUMPRODUCT(ISNUMBER(SEARCH(id,team2IdsRange))*(team2DeltaRange/2)),",
                "start+sumDelta",
                ")",
            ]
        ),
        "C2": join_formula(
            [
                "LET(",
                "id,A2,",
                "team1IdsRange,'Raw Match Data'!$G$2:$G$1000,",
                "team2IdsRange,'Raw Match Data'!$H$2:$H$1000,",
                "SUMPRODUCT(--(ISNUMBER(SEARCH(id,team1IdsRange))+ISNUMBER(SEARCH(id,team2IdsRange))))",
                ")",
            ]
        ),
        "D2": join_formula(
            [
                "LET(",
                "id,A2,",
                "team1IdsRange,'Raw Match Data'!$G$2:$G$1000,",
                "team2IdsRange,'Raw Match Data'!$H$2:$H$1000,",
                "team1ScoreRange,'Raw Match Data'!$O$2:$O$1000,",
                "team2ScoreRange,'Raw Match Data'!$P$2:$P$1000,",
                "SUMPRODUCT(ISNUMBER(SEARCH(id,team1IdsRange))*(team1ScoreRange=1))",
                "+SUMPRODUCT(ISNUMBER(SEARCH(id,team2IdsRange))*(team2ScoreRange=1))",
                ")",
            ]
        ),
        "E2": join_formula(
            [
                "LET(",
                "id,A2,",
                "team1IdsRange,'Raw Match Data'!$G$2:$G$1000,",
                "team2IdsRange,'Raw Match Data'!$H$2:$H$1000,",
                "team1ScoreRange,'Raw Match Data'!$O$2:$O$1000,",
                "team2ScoreRange,'Raw Match Data'!$P$2:$P$1000,",
                "SUMPRODUCT(ISNUMBER(SEARCH(id,team1IdsRange))*(team1ScoreRange=0))",
                "+SUMPRODUCT(ISNUMBER(SEARCH(id,team2IdsRange))*(team2ScoreRange=0))",
                ")",
            ]
        ),
    }

    row1_cells = [make_cell(f"{col_letter(idx)}1", header) for idx, header in enumerate(STANDINGS_HEADERS, 1)]
    row2_cells = [make_cell(ref, formula=formula) for ref, formula in standings_formulas.items()]

    return make_sheet([(1, row1_cells), (2, row2_cells)])


def build_workbook(output_path: Path) -> None:
    """Assemble the OpenXML package and write the .xlsx file."""

    workbook = Element("workbook", xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main")
    workbook.set("xmlns:r", "http://schemas.openxmlformats.org/officeDocument/2006/relationships")

    sheets = SubElement(workbook, "sheets")
    SubElement(sheets, "sheet", name="Raw Match Data", sheetId="1", attrib={"r:id": "rId1"})
    SubElement(sheets, "sheet", name="Config", sheetId="2", attrib={"r:id": "rId2"})
    SubElement(sheets, "sheet", name="Standings", sheetId="3", attrib={"r:id": "rId3"})

    workbook_xml = prettify(workbook)

    workbook_rels = (
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
        "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">\n"
        "  <Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet1.xml\"/>\n"
        "  <Relationship Id=\"rId2\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet2.xml\"/>\n"
        "  <Relationship Id=\"rId3\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet3.xml\"/>\n"
        "  <Relationship Id=\"rId4\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles\" Target=\"styles.xml\"/>\n"
        "</Relationships>\n"
    )

    root_rels = (
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
        "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">\n"
        "  <Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"xl/workbook.xml\"/>\n"
        "</Relationships>\n"
    )

    content_types = (
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
        "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">\n"
        "  <Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>\n"
        "  <Default Extension=\"xml\" ContentType=\"application/xml\"/>\n"
        "  <Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/>\n"
        "  <Override PartName=\"/xl/worksheets/sheet1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/>\n"
        "  <Override PartName=\"/xl/worksheets/sheet2.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/>\n"
        "  <Override PartName=\"/xl/worksheets/sheet3.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/>\n"
        "  <Override PartName=\"/xl/styles.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml\"/>\n"
        "</Types>\n"
    )

    styles = (
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
        "<styleSheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">\n"
        "  <fonts count=\"1\"><font><sz val=\"11\"/><color theme=\"1\"/><name val=\"Calibri\"/><family val=\"2\"/></font></fonts>\n"
        "  <fills count=\"1\"><fill><patternFill patternType=\"none\"/></fill></fills>\n"
        "  <borders count=\"1\"><border><left/><right/><top/><bottom/><diagonal/></border></borders>\n"
        "  <cellStyleXfs count=\"1\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\"/></cellStyleXfs>\n"
        "  <cellXfs count=\"1\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\"/></cellXfs>\n"
        "</styleSheet>\n"
    )

    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as workbook_zip:
        workbook_zip.writestr("[Content_Types].xml", content_types)
        workbook_zip.writestr("_rels/.rels", root_rels)
        workbook_zip.writestr("xl/workbook.xml", workbook_xml)
        workbook_zip.writestr("xl/_rels/workbook.xml.rels", workbook_rels)
        workbook_zip.writestr("xl/worksheets/sheet1.xml", build_raw_match_data_sheet())
        workbook_zip.writestr("xl/worksheets/sheet2.xml", build_config_sheet())
        workbook_zip.writestr("xl/worksheets/sheet3.xml", build_standings_sheet())
        workbook_zip.writestr("xl/styles.xml", styles)


def main() -> None:
    """CLI entrypoint for generating the workbook."""

    parser = argparse.ArgumentParser(description="Generate the padel Elo workbook")
    parser.add_argument(
        "--output",
        default="padel-elo.xlsx",
        help="Path to write the generated workbook (default: padel-elo.xlsx)",
    )
    args = parser.parse_args()

    output_path = Path(args.output)
    build_workbook(output_path)
    print(f"Workbook written to {output_path}")


if __name__ == "__main__":
    main()
