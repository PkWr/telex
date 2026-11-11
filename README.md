# telex

telex is tooling by Patrick Walker that sets an image in running text. Where an ASCII effect picks each character by tone, telex draws every character from a text, so each cell reads through its text one letter at a time. Tone bands choose which text a cell uses. The grid can be tilted and turned, with perspective or in parallel (axonometric), and the letters can run along the columns or fall as rain.

Live at https://telex.pkwr.co (prototype).

## Files

- `index.html`, `app.js`: the tool, drawn on a canvas
- `style.css`, `start.js`, `vendor/fonts`, favicons: the shared shell, copied unchanged from Form
- `proto.css`: the layer over that shell
- `about.html`, `changelog.html`: About and changelog
- `demo/`: demo images, copied from Spot
- `tools/pack.py`: bundles the folder into one HTML file

## Running it

The tool samples image pixels, so it has to be served over http, not opened from a file:

```
python3 -m http.server
```

Then open http://localhost:8000.

Contact: fao@pkwr.co
