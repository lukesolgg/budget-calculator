# data-raw (not shipped)

Drop raw source files here for cleaning. This folder is **gitignored** — nothing
in it is committed or bundled into the app. Only the cleaned output in
`app/src/data/*.js` ships.

## ONS ASHE (job pay by occupation)
1. Download the ASHE "Occupation (4-digit SOC)" earnings table (.zip), extract.
2. Put the CSV/XLSX here, e.g. `ashe-occupation-2024.csv`.
3. Tell Claude the filename — it'll generate `app/src/data/jobs.js`.

The columns we need: SOC code, occupation title, median annual pay, median
hourly pay. (Other columns are fine — they'll be ignored.)
