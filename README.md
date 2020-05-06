# Palettext

Colors extract from image

## Usage

### Code

```bash
npm i palettext --save
```

```javascript
const palettext = require('palettext');

let data = [/*...load 32 bit RGBA data...*/];
// i. e. CanvasRenderingContext2D.getImageData()
// i. e. Node.js Buffer (pngjs,...)
// i. e. Or simple array
let result = palettext(data, {qtyMax: 16});
```

### Command line

```bash
npm i -g palettext
palettext --colors=16 in.png
palettext --colors=16 --format=json in.png >out.json
```

## Options

- `qtyMax/--colors` *[default: 16]* - maximum number of colors to search
- `fixed/--fixed` *[default: []]* - fixed colors
- `colorspace/--colorspace` *[default: 'lab']* - working colorspace (rgb, xyz or lab)
- `threshold/--threshold` *[default: 0.2]* - cutoff threshold for rare colors 
- `stopIncQty/--stop` *[default: 3]* - number of steps with an increasing value to stop 
- `maxIterations/--steps` *[default: 100]* - maximum number of steps 
- `width/` - width of image 