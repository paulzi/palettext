/**
 * @param {Number[]} c
 * @returns {string}
 */
function rgbToHex(c) {
    let result = '#';
    for (let i = 0; i < 3; i++) {
        let hex = c[i].toString(16);
        result += hex.length === 1 ? '0' + hex : hex;
    }
    return result;
}

/**
 * @param {String} hex
 * @returns {Number[]}
 */
function hexToRgb(hex) {
    return hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (m, r, g, b) => '#' + r + r + g + g + b + b)
        .substring(1).match(/.{2}/g)
        .map(x => parseInt(x, 16));
}

/**
 * @param {Number[]} c
 * @returns {Number[]}
 */
function rgbToXyz(c) {
    c = c.slice();
    for (let i = 0; i < 3; i++) {
        let v = c[i] / 255;
        if (v > 0.04045) {
            v = Math.pow((v + 0.055) / 1.055, 2.4) * 100;
        } else {
            v = v / 0.1292;
        }
        c[i] = v;
    }

    return [
        c[0] * 0.4124 + c[1] * 0.3576 + c[2] * 0.1805,
        c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722,
        c[0] * 0.0193 + c[1] * 0.1192 + c[2] * 0.9505
    ];
}

/**
 * @param {Number[]} c
 * @returns {Number[]}
 */
function xyzToRgb(c) {
    c = [
        c[0] *  3.2406 + c[1] * -1.5372 + c[2] * -0.4986,
        c[0] * -0.9689 + c[1] *  1.8758 + c[2] *  0.0415,
        c[0] *  0.0557 + c[1] * -0.2040 + c[2] *  1.0570
    ];
    for (let i = 0; i < 3; i++) {
        let v = c[i] / 100;
        if (v > 0.0031308) {
            v = 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
        } else {
            v = 12.92 * v;
        }
        c[i] = Math.round(v * 255);
    }
    return c;
}

/**
 * @param {Number[]} c
 * @returns {Number[]}
 */
function xyzToLab(c) {
    c = c.slice();
    c[0] /= 95.047;
    c[1] /= 100;
    c[2] /= 108.883;
    for (let i = 0; i < 3; i++) {
        let v = c[i];
        if (v > 0.008856) {
            v = Math.pow(c[i], 1 / 3);
        } else {
            v = 7.787 * v + 16 / 116;
        }
        c[i] = v;
    }

    return [
        116 * c[1] - 16,
        500 * (c[0] - c[1]),
        200 * (c[1] - c[2])
    ];
}

/**
 * @param {Number[]} c
 * @returns {Number[]}
 */
function labToXyz(c) {
    let v = (c[0] + 16) / 116;
    c = [
        c[1] / 500 + v,
        v,
        v - c[2] / 200
    ];
    for (let i = 0; i < 3; i++) {
        v = c[i];
        if (v * v * v > 0.008856) {
            v = v * v * v;
        } else {
            v = (v - 16 / 116) / 7.787;
        }
        c[i] = v;
    }
    c[0] *= 95.047;
    c[1] *= 100;
    c[2] *= 108.883;
    return c;
}

/**
 * @param {Number[]} c
 * @returns {Number[]}
 */
function rgbToLab(c) {
    return xyzToLab(rgbToXyz(c));
}

/**
 * @param {Number[]} c
 * @returns {Number[]}
 */
function labToRgb(c) {
    return xyzToRgb(labToXyz(c));
}

exports.rgbToHex = rgbToHex;
exports.hexToRgb = hexToRgb;
exports.rgbToXyz = rgbToXyz;
exports.xyzToRgb = xyzToRgb;
exports.xyzToLab = xyzToLab;
exports.labToXyz = labToXyz;
exports.rgbToLab = rgbToLab;
exports.labToRgb = labToRgb;