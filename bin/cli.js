#!/usr/bin/env node

const minimist = require('minimist');
const fs = require('fs');
const PNG = require('pngjs').PNG;
const Color = require('../src/color');
const palette = require('../src/palette');

let args = minimist(process.argv.slice(2));
let fixed = args.fixed ? args.fixed.split(',') : [];
fixed = fixed.map(item => Color.hexToRgb(item));

let data = fs.readFileSync(args._[0]);
let png = PNG.sync.read(data);
let result = palette(png.data, {
    fixed:         fixed,
    qtyMax:        args.colors     || 16,
    colorspace:    args.colorspace || 'lab',
    threshold:     args.threshold  || 0.2,
    stopIncQty:    args['stop']    || 3,
    maxIterations: args['steps']   || 100,
    width:         png.width,
});
let format = args.format || 'text';
if (format === 'json') {
    console.log(result);
} else {
    result.forEach(item => {
        console.log(item.hex);
    });
}
