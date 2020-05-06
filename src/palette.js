const Color = require('./color');

/**
 * Преобразует цвет RGB в рабочее цветовое пространство
 * @param {String} colorspace
 * @param {Number[]} color
 * @returns {Number[]}
 */
function rgbToColorspace(colorspace, color) {
    switch (colorspace) {
        case 'rgb':
            return color;
        case 'xyz':
            return Color.rgbToXyz(color);
        case 'lab':
            return Color.rgbToLab(color);
    }
    throw new Error('Colorspace not supported');
}

/**
 * Преобразует цвет из рабочего цветового пространства в RGB
 * @param {String} colorspace
 * @param {Number[]} color
 * @returns {Number[]}
 */
function colorspaceToRgb(colorspace, color) {
    switch (colorspace) {
        case 'rgb':
            return color;
        case 'xyz':
            return Color.xyzToRgb(color);
        case 'lab':
            return Color.labToRgb(color);
    }
    throw new Error('Colorspace not supported');
}

/**
 * Преобразовывает RGBA данные в рабочее цветовое пространства
 * @param {Buffer|TypedArray|Array} data
 * @param {String} colorspace
 * @returns {Float32Array}
 */
function convertDataToColorspace(data, colorspace) {
    let result = new Float32Array(data.length);
    for (let i = 0; i < data.length; i += 4) {
        let c = rgbToColorspace(colorspace, [data[i], data[i + 1], data[i + 2]]);
        result[i]     = c[0];
        result[i + 1] = c[1];
        result[i + 2] = c[2];
        result[i + 3] = data[i + 3];
    }
    return result;
}

/**
 * Инициализирует начальную палитру
 * @param {String} colorspace
 * @param {Number[][]} fixed
 * @param {Float32Array} data
 * @returns {Array}
 */
function initPalette(colorspace, fixed, data) {
    let palette = [];
    for (let i = 0; i < fixed.length; i++) {
        palette.push({
            color:   rgbToColorspace(colorspace, fixed[i]),
            isFixed: true,
        });
    }
    if (palette.length === 0) {
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 127) {
                palette.push({
                    color:   [data[i], data[i + 1], data[i + 2]],
                    isFixed: false,
                });
                break;
            }
        }
    }
    return palette;
}

/**
 * Возвращает ближайший цвет из палитры
 * @param {Object} result
 * @param {Array} palette
 * @param {Number} l
 * @param {Number} a
 * @param {Number} b
 * @returns {boolean}
 */
function findNearestColor(result, palette, l, a, b) {
    let min = Number.POSITIVE_INFINITY;
    let idx = -1;
    for (let i = 0; i < palette.length; i++) {
        let c = palette[i].color;
        let r  = Math.sqrt((c[0] - l) * (c[0] - l) + (c[1] - a) * (c[1] - a) + (c[2] - b) * (c[2] - b));
        if (r < min) {
            min = r;
            idx = i;
        }
    }
    result.index    = idx;
    result.distance = min;
    return idx !== -1;
}

/**
 * Возвращает расстояние между цветами
 * @param {Number[]} a
 * @param {Number[]} b
 * @returns {Number}
 */
function dist(a, b) {
    let r = 0;
    for (let i = 0; i < 3; i++) {
        r += (a[i] - b[i]) * (a[i] - b[i]);
    }
    return Math.sqrt(r);
}

/**
 * Возвращает расстояние между цветами
 * @param {Number[]} a
 * @param {Number} x
 * @param {Number} y
 * @param {Number} z
 * @returns {Number}
 */
function distSeparate(a, x, y, z) {
    let r = 0;
    r += (a[0] - x) * (a[0] - x);
    r += (a[1] - y) * (a[1] - y);
    r += (a[2] - z) * (a[2] - z);
    return Math.sqrt(r);
}

/**
 * Вычисляет шар и вектор разброса точек каждого цвета
 * @param {Array} palette
 * @param {Float32Array} data
 */
function calcBounds(palette, data) {
    let near = {};
    for (let i = 0; i < palette.length; i++) {
        let item = palette[i];
        item.qty   = 0;
        item.bound = {};
        item.sum   = [0, 0, 0];
    }
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 127) {
            findNearestColor(near, palette, data[i], data[i + 1], data[i + 2]);
            let item = palette[near.index];
            let bound = item.bound;
            item.qty++;
            for (let c = 0; c < 3; c++) {
                item.sum[c] += data[i + c];
            }
            if (bound.center === undefined) {
                bound.center = [data[i], data[i + 1], data[i + 2]];
                bound.radius = 0;
            } else {
                let r = distSeparate(bound.center, data[i], data[i + 1], data[i + 2]);
                if (r > bound.radius) {
                    bound.vector = [];
                    for (let c = 0; c < 3; c++) {
                        bound.center[c] += (data[i + c] - bound.center[c]) * (r - bound.radius) / r / 2;
                        bound.vector[c] = data[i + c] - bound.center[c];
                    }
                    bound.radius = (r + bound.radius) / 2;
                }
            }
        }
    }
}

/**
 * Изменяет положение цвета палитры относительно кластера точек
 * @param {Array} palette
 * @param {Number} qtyMax
 * @returns {Number}
 */
function reallocatePalette(palette, qtyMax) {
    let diff = 0;
    for (let i = 0; i < palette.length; i++) {
        let item = palette[i];
        /** @var {Array} item.color */
        let prev = item.color.slice();
        if (!item.isFixed && item.qty > 1) {
            for (let c = 0; c < 3; c++) {
                item.color[c] = item.sum[c] / item.qty;
            }
        }
        if (i < qtyMax) {
            diff += dist(item.color, prev) * item.qty;
        }
    }
    return diff;
}

/**
 * Сортирует палитру по кол-ву
 * @param {Array} palette
 */
function reorderByQty(palette) {
    palette.sort((a, b) => {
        let result = Number(b.isFixed) - Number(a.isFixed);
        if (result !== 0) {
            return result;
        }
        return b.qty - a.qty;
    });
}

/**
 * Сортирует палитру с учётом кол-ва и расстояния между цветами
 * @param {Array} palette
 * @param {Number} rThreshold
 * @param {Number} rFactor
 */
function reorderByDistance(palette, rThreshold, rFactor) {
    const len = palette.length;
    for (let i = 0; i < len; i++) {
        if (i + 1 < len && palette[i + 1].isFixed) {
            continue;
        }

        let max = 0;
        for (let j = i + 1; j < len; j++) {
            let b = palette[j];
            b.dist = Number.POSITIVE_INFINITY;
            for (let k = 0; k <= i; k++) {
                let a = palette[k];
                let r = dist(a.color, b.color);
                if (r < b.dist) {
                    b.dist = r;
                }
            }
            if (b.dist > max) {
                max = b.dist;
            }
        }

        let idx = i + 1;
        for (let j = i + 1; j < len; j++) {
            let a = palette[j];
            a.factor = (a.dist > max ? 1 : a.dist / max);
            a.factor = rFactor + (1 - rFactor) * a.factor;
            a.factor = a.factor * a.qty;
            //a.factor = a.qty * a.dist;
            if (a.factor > palette[idx].factor) {
                idx = j;
            }
        }
        if (i + 1 < len && i + 1 !== idx) {
            let swap = palette[i + 1];
            palette[i + 1] = palette[idx];
            palette[idx]   = swap;
        }

        delete palette[i].dist;
        delete palette[i].factor;
    }
}

/**
 * Разбивает кластеры если шар разброса позволяет
 * @param {Array} palette
 * @returns {Number}
 */
function splitPalette(palette) {
    let result = 0;
    for (let i = 0, len = palette.length; i < len; i++) {
        let bound = palette[i].bound;
        if (bound.radius > 0) {
            result++;
            let color = palette[i].color.slice();
            for (let c = 0; c < 3; c++) {
                color[c] = bound.center[c] + bound.vector[c] / 2;
            }
            palette.push({
                color,
                isFixed: false,
            });
        }
    }
    return result;
}

/**
 * Возвращает массив привязки точек к палитре
 * @param {Float32Array} data
 * @param {Array} palette
 * @returns {Uint16Array}
 */
function quantize(data, palette) {
    let near = {};
    let result = new Uint16Array(data.length / 4);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
        if (data[i + 3] > 127) {
            findNearestColor(near, palette, data[i], data[i + 1], data[i + 2]);
            result[j] = near.index;
        } else {
            result[j] = 65535;
        }
    }
    return result;
}

/**
 * Анализирует размеры цветов
 * @param {Uint16Array} indexed
 * @param {Number} w
 * @param {Array} palette
 */
function analyzeDimensions(indexed, w, palette) {
    let len = indexed.length;
    let ptr = new Int32Array(len);
    for (let i = 0, x = 0; i < len; i++, x++) {
        x = x > w ? x - w : x;
        if (indexed[i] !== 65535) {
            let iTop  = i >= w && indexed[i] === indexed[i - w] ? (ptr[i - w] < 0 ? i - w : ptr[i - w]) : null;
            let iLeft = x > 0  && indexed[i] === indexed[i - 1] ? (ptr[i - 1] < 0 ? i - 1 : ptr[i - 1]) : null;
            if (iTop !== null && iLeft !== null && iTop !== iLeft) {
                ptr[i] = iTop;
                ptr[iTop] += ptr[iLeft] - 1;
                ptr[iLeft] = iTop;
                for (let j = i - w; j < i; j++) {
                    if (ptr[j] === iLeft || (j === iLeft && ptr[j] < 0)) {
                        ptr[j] = iTop;
                    }
                }
            } else if (iTop !== null) {
                ptr[i] = iTop;
                ptr[iTop]--;
            } else if (iLeft !== null) {
                ptr[i] = iLeft;
                ptr[iLeft]--;
            } else {
                ptr[i] = -1;
            }
        } 
    }

    for (let i = 0; i < palette.length; i++) {
        let item = palette[i];
        item.dimMax = 0;
        item.dimAvg = 0;
        item.dimQty = 0;
    }
    for (let i = 0; i < len; i++) {
        let idx = indexed[i];
        if (idx !== 65535 && ptr[i] < 0) {
            let item = palette[idx];
            item.dimMax = Math.max(item.dimMax, -ptr[i]);
            if (-ptr[i] >= 4) {
                item.dimAvg += -ptr[i];
                item.dimQty++;
            }
        }
    }
    for (let i = 0; i < palette.length; i++) {
        let item = palette[i];
        if (item.dimQty > 0) {
            item.dimAvg /= item.dimQty;
        }
    }
}

/**
 * Вычисляет коэффициент цвета
 * @param {Array} palette
 */
function calcFactor(palette) {
    let len = palette.length;
    let avgQty  = 0;
    let avgMax  = 0;
    let avgAvg  = 0;
    for (let i = 0; i < len; i++) {
        let item = palette[i];
        avgQty += Math.sqrt(item.qty) / len;
        avgMax += Math.sqrt(item.dimMax) / len;
        avgAvg += item.dimAvg / len;
    }
    for (let i = 0; i < len; i++) {
        let item = palette[i];
        item.factor = item.qty / Math.pow(avgQty, 2);
        item.factor += item.dimMax / Math.pow(avgMax, 2);
        item.factor *= Math.pow(item.dimAvg * item.dimQty / item.qty, 2);
    }
}

/**
 * Фильтрует по коэффициенту
 * @param {Array} palette
 * @param {Number} threshold
 * @returns {Array}
 */
function filterByFactor(palette, threshold) {
    let result = [];
    for (let i = 0; i < palette.length; i++) {
        let item = palette[i];
        if (item.factor > threshold) {
            result.push(item);
        }
    }
    return result;
}

/**
 * @param {Buffer} buffer
 * @param {Object} [options]
 * @returns {Array}
 */
module.exports = function(buffer, options) {
    options           = options               || {};
    let qtyMax        = options.qtyMax        || 16;
    let fixed         = options.fixed         || [];
    let colorspace    = options.colorspace    || 'lab';
    let threshold     = options.threshold     || 0.2;
    let rThreshold    = options.rThreshold    || 100;
    let rFactor       = options.rFactor       || 0.001;
    let stopIncQty    = options.stopIncQty    || 3;
    let maxIterations = options.maxIterations || 100;
    let width         = options.width         || null;

    let data    = convertDataToColorspace(buffer, colorspace);
    let palette = initPalette(colorspace, fixed, data);

    // main loop
    let prev = Number.POSITIVE_INFINITY;
    for (let step = 0; step < maxIterations; step++) {
        calcBounds(palette, data);
        let diff = reallocatePalette(palette, qtyMax);
        reorderByQty(palette);
        reorderByDistance(palette, rThreshold, rFactor);
        palette = palette.slice(0, qtyMax);
        if (diff > prev) {
            stopIncQty--;
        }
        if (step === maxIterations - 1 || (stopIncQty <= 0)) {
            break;
        }
        let splits = splitPalette(palette);
        if (!splits) {
            break;
        }
        prev = diff;
    }

    let indexed = quantize(data, palette);
    analyzeDimensions(indexed, width, palette);
    calcFactor(palette);
    palette = filterByFactor(palette, threshold);
    for (let i = 0; i < palette.length; i++) {
        let item = palette[i];
        item.color = colorspaceToRgb(colorspace, item.color);
        item.hex = Color.rgbToHex(item.color);
        delete item.bound;
        delete item.sum;
    }

    return palette;
};