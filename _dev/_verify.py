"""Verify every PDF referenced in studies.js exists in pdfs/."""
import json, os, re, sys

WEB = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(WEB, "studies.js"), encoding="utf-8") as f:
    content = f.read()

# Crude parse: extract the JSON-like array body, then parse each object
m = re.search(r"window\.STUDIES\s*=\s*\[(.*)\];", content, re.S)
body = m.group(1)
objs = re.findall(r"\{[^{}]*\}", body)
studies = [json.loads(o) for o in objs]

print(f"Studies in studies.js: {len(studies)}")
pdf_dir = os.path.join(WEB, "pdfs")
existing = set(os.listdir(pdf_dir))
print(f"PDFs in pdfs/: {len(existing)}")

missing = []
for s in studies:
    if s["pdf"] not in existing:
        missing.append((s["id"], s["pdf"]))

if missing:
    print(f"\n{len(missing)} MISSING:")
    for sid, p in missing:
        print(f"  {sid}: {p}")
    sys.exit(1)

# Find PDFs not referenced by any study
referenced = {s["pdf"] for s in studies}
orphans = existing - referenced
if orphans:
    print(f"\nOrphan PDFs (in pdfs/ but not in studies.js): {len(orphans)}")
    for o in sorted(orphans):
        print(f"  {o}")

print("\nOK — all referenced PDFs exist.")
