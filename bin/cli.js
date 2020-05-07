#!/usr/bin/env node

const minimist = require('minimist');
const fs = require('fs');
const path = require('path');
const PNG = require('pngjs').PNG;
const jpeg = require('jpeg-js');
const Color = require('../src/color');
const palette = require('../src/palette');

let args = minimist(process.argv.slice(2));
let fixed = args.fixed ? args.fixed.split(',') : [];
fixed = fixed.map(item => Color.hexToRgb(item));

let filepath = args._[0];
let data = fs.readFileSync(filepath);

let img;
let ext = path.extname(filepath).toLowerCase();
if (ext === '.jpg' || ext === '.jpeg') {
    img = decodeJpg(data) || decodePng(data);
} else {
    img = decodePng(data) || decodeJpg(data);
}

let result = palette(img.data, {
    fixed:         fixed,
    qtyMax:        args.colors     || 16,
    colorspace:    args.colorspace || 'lab',
    threshold:     args.threshold  || 0.2,
    stopIncQty:    args['stop']    || 3,
    maxIterations: args['steps']   || 100,
    width:         img.width,
});
let format = args.format || 'text';
if (format === 'json') {
    console.log(result);
} else {
    result.forEach(item => {
        console.log(item.hex);
    });
}

/**
 * @param {Buffer} data
 * @returns {Object}
 */
function decodeJpg(data) {
    let result;
    try {
        result = jpeg.decode(data, {
            formatAsRGBA:   true,
            colorTransform: true,
        });
    } catch (e) {}
    return result && result.width ? result : null;
}

/**
 * @param {Buffer} data
 * @returns {Object}
 */
function decodePng(data) {
    let result;
    try {
        result = PNG.sync.read(data);
    } catch (e) {}
    return result && result.width ? result : null;
}