// Hash implementations based on code from:
// https://www.shadertoy.com/view/XlGcRh

import { Vec2, Vec3, vec2Splay, vec3Cross, vec3Splay, vecAdd, vecFract, vecMulK, vecNormalize, xAxis, yAxis } from "./juvec";
import { floor, mod, randomRange, smoothstepMix } from "./aliasedFunctions";


export const fillBufferWithRandomRange = (buf: Float32Array, a: number, b: number) => {
    for (let i = 0; i < buf.length; ++i) {
        buf[i] = randomRange(a, b);
    }
};


export const valueNoise2dSampler = (tiles: number) => {
    const randBuf = new Float32Array(tiles * tiles);
    fillBufferWithRandomRange(randBuf, 0, 1);
    // TODO: Borrow
    const tmp = vec2Splay();

    return (v: Vec2) => {
        vecMulK(v, tiles, tmp);

        const ix0 = mod(floor(tmp[0]), tiles);
        const ix1 = mod((ix0 + 1), tiles);
        const iy0 = mod(floor(tmp[1]), tiles);
        const iy1 = mod((iy0 + 1), tiles);

        vecFract(tmp, tmp);
        const a = smoothstepMix(randBuf[iy0 * tiles + ix0], randBuf[iy0 * tiles + ix1], tmp[0]);
        const b = smoothstepMix(randBuf[iy1 * tiles + ix0], randBuf[iy1 * tiles + ix1], tmp[0]);
        return smoothstepMix(a, b, tmp[1]);
    };
};


export const fbm2dSampler = (numOctaves: number, startingScale: number, gain: number) => {
    const samplers: ReturnType<typeof valueNoise2dSampler>[] = [];

    for (let i = 0; i < numOctaves; ++i) {
        samplers.push(valueNoise2dSampler(startingScale));
        startingScale *= 2;
    }

    return (v: Vec2) => {
        let r = 0;
        let a = 1;
        for (let i = 0; i < numOctaves; ++i) {
            r += gain * a * samplers[i](v);
            a /= 2;
        }
        return r;
    };
}

// xyz: Normal, w: H
export const fbmTexture = (w: number, numOctaves: number, startingScale: number, gain: number) => {
    const buf = new Float32Array(w * w * 4);
    const sampler = fbm2dSampler(numOctaves, startingScale, gain);

    const stepSize = 2;
    const h = 2 * stepSize / w;

    // Todo: borrow
    const p = vec2Splay();
    const n = vec3Splay();

    const na = vec3Splay();
    na[0] = h;
    const nb = vec3Splay();
    nb[1] = h;

    const tmp2a = vec2Splay();
    for (let y = 0; y < w; ++y) {
        p[1] = y / (w - 1);
        for (let x = 0; x < w; ++x) {
            p[0] = x / (w - 1);
            const idx = 4 * (y * w + x);
            buf[idx + 3] = sampler(p);
        }
    }

    for (let y = 0; y < w; ++y) {
        const y0 = mod(y - stepSize, w);
        const y1 = mod(y + stepSize, w);
        for (let x = 0; x < w; ++x) {
            const x0 = mod(x - stepSize, w);
            const x1 = mod(x + stepSize, w);

            na[2] = buf[4 * (y * w + x1) + 3] - buf[4 * (y * w + x0) + 3];
            nb[2] = buf[4 * (y1 * w + x) + 3] - buf[4 * (y0 * w + x) + 3];

            vec3Cross(na, nb, n);
            vecNormalize(n, n);

            const idx = 4 * (y * w + x);

            /*             vecMulK(xAxis as any as Vec2, h, tmp2a);
                        vecAdd(tmp2a, p, tmp2a);
                        const dx0 = sampler(tmp2a);
            
                        vecMulK(xAxis as any as Vec2, -h, tmp2a);
                        vecAdd(tmp2a, p, tmp2a);
                        na[2] = sampler(tmp2a) - dx0;
            
                        vecMulK(yAxis as any as Vec2, h, tmp2a);
                        vecAdd(tmp2a, p, tmp2a);
                        const dy0 = sampler(tmp2a);
            
                        vecMulK(yAxis as any as Vec2, -h, tmp2a);
                        vecAdd(tmp2a, p, tmp2a);
                        nb[2] = sampler(tmp2a) - dy0;
            
                        vec3Cross(na, nb, n);
                        vecNormalize(n, n); */

            buf[idx] = n[0];
            buf[idx + 1] = n[1];
            buf[idx + 2] = n[2];
        }
    }
    return buf;
}