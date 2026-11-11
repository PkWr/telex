#!/usr/bin/env python3
"""Packs the prototype into one self-contained HTML file (for publishing as an artifact). Usage: python3 tools/pack.py out.html"""
import base64, io, json, re, sys
from pathlib import Path
from PIL import Image
root = Path(__file__).resolve().parent.parent
def b64(p): return base64.b64encode(Path(p).read_bytes()).decode()
css = (root/"style.css").read_text() + (root/"proto.css").read_text()
css = re.sub(r'url\("vendor/fonts/([^"]+\.woff2)"\)', lambda m: 'url("data:font/woff2;base64,%s")' % b64(root/"vendor/fonts"/m.group(1)), css)
about = (root/"about.html").read_text()
main = re.search(r"<main[^>]*>(.*)</main>", about, re.S).group(1)
start = (root/"start.js").read_text()
start = start.replace('fetch("about.html").then(function (r) { return r.text(); })', 'Promise.resolve("<html><body><main>" + ' + json.dumps(main) + ' + "</main></body></html>")')
uris = []
for i in [1, 3, 5, 8, 11, 14, 18, 22]:
    im = Image.open(root/"demo"/f"demo-{i:02d}.jpg").convert("RGB"); im.thumbnail((640, 640))
    b = io.BytesIO(); im.save(b, "JPEG", quality=70); uris.append("data:image/jpeg;base64," + base64.b64encode(b.getvalue()).decode())
html = (root/"index.html").read_text()
html = re.sub(r'<link rel="(icon|apple-touch-icon)"[^>]*>\n', "", html)
html = re.sub(r'<link rel="stylesheet" href="style.css">\n<link rel="stylesheet" href="proto.css">', lambda m: "<style>" + css + "</style>", html)
html = html.replace('<script src="start.js"></script>', "<script>" + start + "</script>")
html = html.replace('<script src="app.js"></script>', "<script>window.IMGS=" + json.dumps(uris) + ";</script><script>" + (root/"app.js").read_text() + "</script>")
html = html.replace('<!doctype html>', '<!DOCTYPE html>', 1)
Path(sys.argv[1]).write_text(html); print(len(html))
