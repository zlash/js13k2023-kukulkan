import { DEBUG } from "./autogenerated";

export const sqrt = Math.sqrt;
export const assert = DEBUG ? ((cond: boolean, msg?: string) => cond || ((() => { throw new Error(msg ?? "No Error Message") })())) : (() => { });
export const sin = Math.sin;
export const cos = Math.cos;
export const tan = Math.tan;
export const atan2 = Math.atan2;
export const pow = Math.pow;
export const floor = Math.floor;
export const trunc = (x: number) => (x | 0);
export const fract = (x: number) => x - (x | 0);
export const sign = (x: number) => x >= 0 ? 1 : -1;
export const max = Math.max;
export const min = Math.min;
export const acos = Math.acos;
export const asin = Math.asin;
export const abs = Math.abs;
export const clamp = (x: number, a: number, b: number) => max(a, min(b, x));
export const symmetricClamp = (x: number, a: number) => clamp(x, -a, a);
export const saturate = (x: number) => clamp(x, 0, 1);
export const random = Math.random;
export const randomRange = (a: number, b: number) => a + random() * (b - a);
export const randomRangeInt = (a: number, b: number) => trunc(randomRange(trunc(a), trunc(b)));
export const Pi = Math.PI;
export const PiHalf = Pi / 2;
export const TwoPi = 2.0 * Pi;
export const Deg = Pi / 180;
export const Rad = 180 / Pi;
export const Eps = Number.EPSILON;
export const arrayLast = <T>(x: Array<T>) => x[x.length - 1];
export const arrayFromLast = <T>(x: Array<T>, idx: number) => x[x.length - 1 - idx];

export const mix = (a: number, b: number, k: number) => a + (b - a) * k;
export const invLerp = (a: number, b: number, k: number) => a == b ? a : (k - a) / (b - a);
export const invLerpSaturated = (a: number, b: number, k: number) => saturate(invLerp(a, b, k));

export const remap = (x: number, a: number, b: number, aa: number, bb: number) => mix(aa, bb, invLerp(a, b, x));
export const remapClamped = (x: number, a: number, b: number, aa: number, bb: number) => mix(aa, bb, saturate(invLerp(a, b, x)));


export const pickFromArray = <T>(a: Array<T>) => {
    return a[randomRangeInt(0, a.length)];
};

export const shuffleArray = <T>(a: Array<T>) => {
    const len = a.length;
    for (let i = 0; i < len - 1; ++i) {
        const j = randomRangeInt(i, len);
        const tmp = a[i];
        a[i] = a[j];
        a[j] = tmp;
    }
    return a;
}

export const smoothstep = (a: number, b: number, k: number) => {
    const r = saturate(invLerp(a, b, k));
    return r * r * (3.0 - 2.0 * r);
};

export const smoothstepMix = (a: number, b: number, k: number) => {
    return mix(a, b, smoothstep(0, 1, k));
};

export const almostUnitIdentity = (x: number) => {
    return x * x * (2 - x);
};

export const mod = (a: number, b: number) => {
    let r = a % b;
    return r < 0 ? (r + b) : r;
};

export const tweenQuad = (x: number) => x * x;
export const tweenComplement = (func: (x: number) => number, x: number) => 1 - func(x);
export const tweenOut = (func: (x: number) => number, x: number) => 1 - func(1 - x);

export const tweenParabola = (a: number, x: number) => a * x * x + (1 - a) * x;


/*
 This is a lagrangian interpolation between the points:
 (0, 0), (0.25, a), (0.75, b), (1, 1)
 It can be used to drive stuff that overshoots at the beginning and end
 tweaking a and b
*/
export const tweenCubicOvershoots = (a: number, b: number, x: number) => {
    const k = 32 / 3;
    const l = 48 / 9;
    const x_1 = x - 1;
    const x_75 = x - 0.75;
    const x_25 = x - 0.25;
    return (k * a * x_1 * x_75 - k * b * x_1 * x_25 + l * x_75 * x_25) * x;
};


export const tweenDoubleOvershoot = (x: number) => tweenCubicOvershoots(-0.25, 0.9, x);

export const plateau = (x: number, a: number, b: number) => {
    return smoothstep(0, a, x) * smoothstep(1, 1 - b, x);
};


export const powerCurve = (x: number, a: number, b: number) => {
    return pow(x, a) * pow(1.0 - x, b);
};
