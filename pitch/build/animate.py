"""Add morph transitions and auto-playing entrance animations to the deck.

Run with the project venv after deck.js:
    .venv/bin/python pitch/build/animate.py pitch/build/out/the-agentic-delivery-pipeline.pptx

Every slide gets a Morph transition (Fade for viewers without Morph). Shapes
named "a<step><kind>_..." by deck.js enter in step order, each step starting
automatically shortly after the previous one, so the presenter never has to
click through builds. kind: f = fade, w = wipe from left, u = wipe from bottom.
"""
import re
import shutil
import sys
import tempfile
import zipfile

from lxml import etree

P = "http://schemas.openxmlformats.org/presentationml/2006/main"
NS = {"p": P}
STEP_MS = 380
EFFECTS = {
    "f": dict(preset=10, sub=0, filt="fade", dur=450),
    "w": dict(preset=22, sub=8, filt="wipe(left)", dur=600),
    "u": dict(preset=22, sub=4, filt="wipe(up)", dur=500),
}
TRANSITION = (
    '<mc:AlternateContent><mc:Choice Requires="p159">'
    '<p:transition spd="slow" p14:dur="1000"><p159:morph option="byObject"/></p:transition>'
    '</mc:Choice><mc:Fallback><p:transition spd="slow"><p:fade/></p:transition></mc:Fallback>'
    '</mc:AlternateContent>'
)
ROOT_NS = (
    ' xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"'
    ' xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main"'
    ' xmlns:p159="http://schemas.microsoft.com/office/powerpoint/2015/09/main"'
)


def animated_shapes(xml):
    """[(step, kind, spid, is_sp)] for every tagged shape, in document order."""
    tree = etree.fromstring(xml)
    out = []
    for c in tree.iter(f"{{{P}}}cNvPr"):
        m = re.match(r"^a(\d+)([fwu])_", c.get("name", ""))
        if m:
            owner = c.getparent().getparent()
            out.append((int(m.group(1)), m.group(2), c.get("id"), etree.QName(owner).localname == "sp"))
    return out


def timing_xml(shapes):
    ids = iter(range(3, 10_000))
    steps = sorted({s for s, *_ in shapes})
    groups = []
    for n, step in enumerate(steps):
        effects = []
        for k, (_, kind, spid, _) in enumerate([x for x in shapes if x[0] == step]):
            e = EFFECTS[kind]
            node = "afterEffect" if k == 0 else "withEffect"
            effects.append(
                f'<p:par><p:cTn id="{next(ids)}" presetID="{e["preset"]}" presetClass="entr" presetSubtype="{e["sub"]}" fill="hold" grpId="0" nodeType="{node}">'
                f'<p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>'
                f'<p:set><p:cBhvr><p:cTn id="{next(ids)}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>'
                f'<p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr>'
                f'<p:to><p:strVal val="visible"/></p:to></p:set>'
                f'<p:animEffect transition="in" filter="{e["filt"]}"><p:cBhvr><p:cTn id="{next(ids)}" dur="{e["dur"]}"/>'
                f'<p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl></p:cBhvr></p:animEffect>'
                f'</p:childTnLst></p:cTn></p:par>'
            )
        groups.append(
            f'<p:par><p:cTn id="{next(ids)}" fill="hold"><p:stCondLst><p:cond delay="{n * STEP_MS}"/></p:stCondLst>'
            f'<p:childTnLst>{"".join(effects)}</p:childTnLst></p:cTn></p:par>'
        )
    seen, bld = set(), []
    for _, _, spid, is_sp in shapes:
        if is_sp and spid not in seen:
            seen.add(spid)
            bld.append(f'<p:bldP spid="{spid}" grpId="0" animBg="1"/>')
    return (
        '<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>'
        '<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>'
        '<p:par><p:cTn id="9999" fill="hold"><p:stCondLst><p:cond delay="indefinite"/>'
        '<p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond></p:stCondLst>'
        f'<p:childTnLst>{"".join(groups)}</p:childTnLst></p:cTn></p:par>'
        '</p:childTnLst></p:cTn>'
        '<p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>'
        '<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst>'
        '</p:seq></p:childTnLst></p:cTn></p:par></p:tnLst>'
        f'<p:bldLst>{"".join(bld)}</p:bldLst></p:timing>'
    )


def process(xml):
    if "<p:transition" in xml or "<p:timing" in xml:
        raise SystemExit("slide already has a transition or timing; rebuild from deck.js first")
    shapes = animated_shapes(xml.encode())
    tail = TRANSITION + (timing_xml(shapes) if shapes else "")
    xml = re.sub(r"<p:sld\b", "<p:sld" + ROOT_NS, xml, count=1)
    return xml.replace("</p:sld>", tail + "</p:sld>"), len(shapes)


def main(path):
    tmp = tempfile.mktemp(suffix=".pptx")
    total = 0
    with zipfile.ZipFile(path) as zin, zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if re.fullmatch(r"ppt/slides/slide\d+\.xml", item.filename):
                xml, n = process(data.decode("utf-8"))
                total += n
                data = xml.encode("utf-8")
            zout.writestr(item, data)
    shutil.move(tmp, path)
    print(f"animated {total} shapes in {path}")


if __name__ == "__main__":
    main(sys.argv[1])
