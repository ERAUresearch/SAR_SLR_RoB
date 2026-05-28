# SAR SLR · Risk-of-Bias Assessment

A web form for the three co-author risk-of-bias / study-quality appraisal of the
systematic literature review:

> **Optimizing Drone-Based Search and Rescue With ADS-B-Enabled Deconfliction
> in Mixed Manned-Unmanned Operations.**

**Live site:** https://erauresearch.github.io/SAR_SLR_RoB/

## What this is

Each reviewer enters the shared access code, gives their name, rates all 54
included studies against the eight-question modified MMAT-informed engineering
quality checklist with the PDF visible side-by-side, and downloads an Excel
file at the end. The three Excel files are then merged offline for the
consensus meeting.

## How it works

- **Pure static site** — no backend, no accounts, no tracking. Each reviewer's
  responses live only in their browser's `localStorage`.
- All 54 study PDFs are bundled in `/pdfs/` so reviewers can open each paper
  with one click from the form.
- Excel export uses the SheetJS library (`/lib/xlsx.full.min.js`).

## Repo layout

```
index.html              Single-page app
styles.css              Styling
app.js                  Routing, state, scoring, export logic
studies.js              Auto-generated: 54 studies × {id, track, citation, pdf}
lib/xlsx.full.min.js    SheetJS (vendored)
pdfs/                   54 study PDFs (~235 MB)
_dev/                   Build / verification scripts (Python, dev-only)
```

## Regenerating the study metadata

If a PDF is added, removed, or renamed:

```sh
cd _dev
python _build_data.py    # rebuilds ../studies.js
python _verify.py        # checks every referenced PDF exists in ../pdfs/
```

## Local development

```sh
python -m http.server 8765
# open http://localhost:8765
```

## Scoring rubric (summary)

| Response    | Score | Counts as "No"? |
|-------------|-------|-----------------|
| Yes         | 1     | no              |
| Partly      | 0.5   | no              |
| No          | 0     | yes             |
| Cannot tell | 0     | no              |
| N/A         | —     | (excluded)      |

**Overall judgement:**
- *Low concern* — ≥ 75 % and ≤ 1 No
- *Some concern* — 50–74 %, or 2–3 No
- *High concern* — < 50 %, or ≥ 4 No
- *Unclear* — set manually if too much info is missing

See the in-app **Help** screen for the full procedure.
