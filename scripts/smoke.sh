#!/usr/bin/env bash
# Post-deploy smoke test against the PUBLIC URL (the same origin browsers use).
# Fails loudly if the page, the health check, the Google services catalog, a live plan or the
# quote-file reader does not work, and prints which engine narrated the plan (gemini or the
# offline planner, with its reason), the models, the verdict, the budget total and the task
# count. The quote reader must refuse a fake PDF by its magic bytes (400) and must transcribe a
# real one-page PDF when the AI is configured (or answer 502 with the paste hint when it is
# not). Prints no request bodies beyond the samples below.
#
# Usage: scripts/smoke.sh https://intezaam.lehana.in
set -euo pipefail
BASE="${1:?usage: smoke.sh <base-url>}"
PY="$(command -v python3 || command -v python)"

echo "--> GET / (web app shell)"
curl -fsS -o /dev/null -w "   %{http_code} in %{time_total}s\n" "${BASE}/"

echo "--> GET /api/health"
HEALTH="$(curl -fsS "${BASE}/api/health")"
echo "   ${HEALTH}"
AI_CONFIGURED="$(printf '%s' "${HEALTH}" | "${PY}" -c "
import json, sys
print(str(json.load(sys.stdin)['ai']['configured']).lower())
")"

echo "--> GET /api/google/services (statuses implemented/declined only)"
curl -fsS "${BASE}/api/google/services" | "${PY}" -c "
import json, sys
services = json.load(sys.stdin)['services']
assert {s['status'] for s in services} <= {'implemented', 'declined'}
done = sum(1 for s in services if s['status'] == 'implemented')
print('  ', done, 'implemented,', len(services) - done, 'declined')
"

echo "--> POST /api/plan (a 300-guest Jaipur wedding about four months out)"
# Dates are computed from today so the sample never falls outside the planning window.
BODY="$("${PY}" - <<'PY'
import datetime, json
today = datetime.date.today()
context = {
    "family": "wedding", "kind": "wedding", "title": "Jaipur wedding", "tradition": "north-hindu",
    "city": "Jaipur", "destination": False, "guests": 300, "budgetInr": 2500000,
    "functions": ["mehendi", "sangeet", "wedding", "reception"], "venueSetting": "mixed",
    "diet": {"menu": "veg", "jainGuests": True, "halal": False, "satvik": False}, "alcohol": False,
    "priorities": ["catering", "decor", "photo_video"], "cut": "transport", "disabledCategories": [],
    "styleTags": ["royal", "traditional", "floral"],
    "accessibility": {"elderly": True, "wheelchair": False, "kids": False}, "helpLevel": "family",
    "toggles": {"jewellery": False, "planner": False}, "outstationShare": 0.4,
    "sound": {"amplified": True, "endHhmm": "23:30", "nearSilenceZone": False, "crackers": False},
    "language": "en", "dateIso": (today + datetime.timedelta(days=120)).isoformat(), "dateFlexible": False,
}
print(json.dumps({"context": context, "todayIso": today.isoformat()}))
PY
)"
curl -fsS -X POST "${BASE}/api/plan" -H 'content-type: application/json' -d "${BODY}" \
  | "${PY}" -c "
import json, sys
d = json.load(sys.stdin)
p, plan = d['provenance'], d['plan']
v = plan['verdict']
print('   mode:', p['mode'], '| reason:', p.get('reason', '-'), '| models:', p['models'], '| latency ms:', p['latencyMs'])
print('   verdict:', v['money']['status'], '/', v['time']['status'], '|', v['headline'])
print('   budget total: Rs', plan['budget']['totalInr'], '| tasks:', len(plan['timeline']['tasks']))
"

# Two quote-read bodies, one per line: a one-page PDF quote built here (no file on disk) and an
# HTML page that claims to be a PDF, so the magic-byte check has a file to pass and one to refuse.
QUOTE_BODIES="$("${PY}" - <<'PY'
import base64, json
lines = ["Sharma Caterers - quotation", "Veg thali Rs 1,200 per plate + 5% GST",
         "Minimum 250 plates", "Advance 30% on booking, balance on the event day"]
text = " ".join(f"({line}) Tj 0 -22 Td" for line in lines)
stream = f"BT /F1 13 Tf 72 760 Td {text} ET".encode()
objects = [
    b"<< /Type /Catalog /Pages 2 0 R >>",
    b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842]"
    b" /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream",
]
pdf, offsets = bytearray(b"%PDF-1.4\n"), []
for number, body in enumerate(objects, start=1):
    offsets.append(len(pdf))
    pdf += b"%d 0 obj\n" % number + body + b"\nendobj\n"
xref = len(pdf)
pdf += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objects) + 1)
pdf += b"".join(b"%010d 00000 n \n" % offset for offset in offsets)
pdf += b"trailer << /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objects) + 1, xref)

def body(data):
    return {"file": {"mimeType": "application/pdf", "fileName": "sample-quote.pdf",
                     "dataBase64": base64.b64encode(data).decode()}}

print(json.dumps(body(bytes(pdf))))
print(json.dumps(body(b"<html><script>alert(1)</script></html>")))
PY
)"
REAL_QUOTE="$(printf '%s\n' "${QUOTE_BODIES}" | sed -n 1p)"
FAKE_QUOTE="$(printf '%s\n' "${QUOTE_BODIES}" | sed -n 2p)"

# Prints only the status code; the transcript never reaches the log.
read_quote() {
  curl -sS -o /dev/null -w "%{http_code}" -X POST "${BASE}/api/quotes/read" \
    -H 'content-type: application/json' -d "$1"
}

echo "--> POST /api/quotes/read with a fake PDF (must be refused by its magic bytes)"
FAKE_STATUS="$(read_quote "${FAKE_QUOTE}")"
echo "   ${FAKE_STATUS}"
[ "${FAKE_STATUS}" = "400" ] || { echo "!! expected 400 for a fake PDF"; exit 1; }

echo "--> POST /api/quotes/read with a one-page PDF quote (AI configured: ${AI_CONFIGURED})"
REAL_STATUS="$(read_quote "${REAL_QUOTE}")"
echo "   ${REAL_STATUS}"
if [ "${AI_CONFIGURED}" = "true" ]; then
  [ "${REAL_STATUS}" = "200" ] || { echo "!! expected the PDF quote to be transcribed"; exit 1; }
else
  # No offline OCR: without a model the reader asks the family to paste the text instead.
  [ "${REAL_STATUS}" = "502" ] || { echo "!! expected 502 (paste hint) with no AI"; exit 1; }
fi

echo "==> Smoke test passed"
