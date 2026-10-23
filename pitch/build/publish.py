"""Publish the built deck as the next version: pitch/v<N>-the-agentic-delivery-pipeline.{pptx,pdf}.

Run with the project venv after deck.js and animate.py:
    .venv/bin/python pitch/build/publish.py

Never overwrites: it picks the first unused version number. The PDF is exported
through Keynote (no LibreOffice on this machine).
"""
import re
import shutil
import subprocess
from pathlib import Path

PITCH = Path(__file__).resolve().parents[1]
SRC = PITCH / "build" / "out" / "the-agentic-delivery-pipeline.pptx"
NAME = "the-agentic-delivery-pipeline"

used = [int(m.group(1)) for p in PITCH.glob(f"v*-{NAME}.*") if (m := re.match(r"v(\d+)-", p.name))]
v = max(used, default=0) + 1
pptx, pdf = PITCH / f"v{v}-{NAME}.pptx", PITCH / f"v{v}-{NAME}.pdf"
assert not pptx.exists() and not pdf.exists(), f"v{v} already exists"

shutil.copy2(SRC, pptx)
subprocess.run(["osascript", "-e", f'''tell application "Keynote"
set d to open POSIX file "{pptx}"
export d to POSIX file "{pdf}" as PDF
close d saving no
end tell'''], check=True)
print(f"published v{v}: {pptx.name}, {pdf.name}")
