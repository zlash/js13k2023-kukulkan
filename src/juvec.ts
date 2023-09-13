/*
    All vectors have 4 components to avoid different functions for each size
*/

import { Deg, abs, acos, assert, atan2, clamp, cos, fract, max, mix, sin, smoothstep, sqrt, symmetricClamp, tan } from "./aliasedFunctions";

// Todo: Add vector type validation to catch potential cast issues
// This will need metadata on the vectors themselves
// const DebugValidateVectorTypes = true;

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type Vec4 = [number, number, number, number];
export type Quaternion = Vec4;
export type Vec = Vec2 | Vec3 | Vec4;
// Column major
export type Mat4 = [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];

export const vec2 = (x: number, y: number) => {
    return [x, y, 0, 0] as unknown as Vec2;
};

export const vec2Splay = (k?: number) => {
    k = k ?? 0;
    return [k, k, 0, 0] as unknown as Vec2;
};

export const vec3 = (x: number, y: number, z: number) => {
    return [x, y, z, 0] as unknown as Vec3;
};

export const vec3Splay = (k?: number) => {
    k = k ?? 0;
    return [k, k, k, 0] as unknown as Vec3;
};

export const vec4 = (x: number, y: number, z: number, w: number) => {
    return [x, y, z, w] as unknown as Vec4;
};

export const vec4Splay = (k?: number) => {
    k = k ?? 0;
    return [k, k, k, k] as unknown as Vec4;
};

export const vecSet = <T extends Vec>(v: T, x?: number, y?: number, z?: number, w?: number) => {
    v[0] = x ?? 0;
    v[1] = y ?? 0;
    (v as Vec4)[2] = z ?? 0;
    (v as Vec4)[3] = w ?? 0;
};

export const vecReset = <T extends Vec>(r: T) => {
    vecSet(r);
};

export const vecCopy = <T extends Vec>(dst: T, src: T) => {
    vecSet(dst, src[0], src[1], src[2], src[3]);
};

export const vecClone = <T extends Vec>(v: T) => {
    let r = vec4Splay() as T;
    vecCopy(r, v);
    return r;
};

export const vecAdd = <T extends Vec>(a: T, b: T, r: T) => {
    r[0] = a[0] + b[0];
    r[1] = a[1] + b[1];
    (r as Vec4)[2] = (a as Vec4)[2] + (b as Vec4)[2];
    (r as Vec4)[3] = (a as Vec4)[3] + (b as Vec4)[3];
};

export const vecSub = <T extends Vec>(a: T, b: T, r: T) => {
    r[0] = a[0] - b[0];
    r[1] = a[1] - b[1];
    (r as Vec4)[2] = (a as Vec4)[2] - (b as Vec4)[2];
    (r as Vec4)[3] = (a as Vec4)[3] - (b as Vec4)[3];
};

export const vecMulK = <T extends Vec>(a: T, k: number, r: T) => {
    r[0] = a[0] * k;
    r[1] = a[1] * k;
    (r as Vec4)[2] = (a as Vec4)[2] * k;
    (r as Vec4)[3] = (a as Vec4)[3] * k;
};

export const vecFMKA = <T extends Vec>(a: T, k: number, b: T, r: T) => {
    r[0] = a[0] * k + b[0];
    r[1] = a[1] * k + b[1];
    (r as Vec4)[2] = (a as Vec4)[2] * k + (b as Vec4)[2];
    (r as Vec4)[3] = (a as Vec4)[3] * k + (b as Vec4)[3];
};

export const vecDot = <T extends Vec>(a: T, b: T) => {
    // Validate vec type
    return a[0] * b[0] + a[1] * b[1] + (a as Vec4)[2] * (b as Vec4)[2] + (a as Vec4)[3] * (b as Vec4)[3];
};

export const vecLength = <T extends Vec>(a: T) => {
    return sqrt(vecDot(a, a));
};

export const vecNormalize = (a: Vec, r: Vec) => {
    vecMulK(a, 1 / vecLength(a), r);
};

export const vecEq = (a: Vec, b: Vec) => {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
};

export const vecAbs = (a: Vec, r: Vec) => {
    r[0] = abs(a[0]);
    r[1] = abs(a[1]);
    (r as Vec4)[2] = abs((a as Vec4)[2]);
    (r as Vec4)[3] = abs((a as Vec4)[3]);
};

export const vecFract = (a: Vec, r: Vec) => {
    r[0] = fract(a[0]);
    r[1] = fract(a[1]);
    (r as Vec4)[2] = fract((a as Vec4)[2]);
    (r as Vec4)[3] = fract((a as Vec4)[3]);
};

export const vecMax = (a: Vec, b: Vec, r: Vec) => {
    r[0] = max(a[0], b[0]);
    r[1] = max(a[1], b[1]);
    (r as Vec4)[2] = max((a as Vec4)[2], (b as Vec4)[2]);
    (r as Vec4)[3] = max((a as Vec4)[3], (b as Vec4)[3]);
};

export const vecSymmetricClamp = (a: Vec, b: Vec, r: Vec) => {
    r[0] = symmetricClamp(a[0], b[0]);
    r[1] = symmetricClamp(a[1], b[1]);
    (r as Vec4)[2] = symmetricClamp((a as Vec4)[2], (b as Vec4)[2]);
    (r as Vec4)[3] = symmetricClamp((a as Vec4)[3], (b as Vec4)[3]);
};

export const vecMix = (a: Vec, b: Vec, t: number, r: Vec) => {
    r[0] = mix(a[0], b[0], t);
    r[1] = mix(a[1], b[1], t);
    (r as Vec4)[2] = mix((a as Vec4)[2], (b as Vec4)[2], t);
    (r as Vec4)[3] = mix((a as Vec4)[3], (b as Vec4)[3], t);
};

export const vecNormalizeSafe = (a: Vec, r: Vec) => {
    const l = vecLength(a);
    if (l === 0) {
        vecReset(r);
    } else {
        vecMulK(a, 1 / l, r);
    }
};

// Vectors must be normalized!
export const vec2AngleBetween = (a: Vec2, b: Vec2) => {
    return atan2(b[1] * a[0] - b[0] * a[1], a[0] * b[0] + a[1] * b[1]);
};

export const vec2Rotate = (v: Vec2, angle: number, r: Vec2) => {
    assert(v != r);
    const c = cos(angle);
    const s = sin(angle);
    r[0] = c * v[0] + s * v[1];
    r[1] = c * v[1] - s * v[0];
};


export const vec3Cross = (a: Vec3, b: Vec3, r: Vec3) => {
    assert(a != r);
    assert(b != r);
    r[0] = a[1] * b[2] - a[2] * b[1];
    r[1] = a[2] * b[0] - a[0] * b[2];
    r[2] = a[0] * b[1] - a[1] * b[0];
};


export const mat4Diagonal = (v: number, dst: Mat4) => {
    dst.fill(0);
    dst[0] = dst[5] = dst[10] = dst[15] = v;
}

export const mat4 = (v: number) => {
    let m = Array(16) as Mat4;
    mat4Diagonal(1, m);
    return m;
};

export const mat4Ortho = (rw: number, rh: number, near: number, far: number, dst: Mat4) => {
    const depthSize: number = far - near;
    mat4Diagonal(1, dst);
    dst[0] = 1 / rw;
    dst[5] = -1 / rh;
    dst[10] = -2 / depthSize;
    dst[14] = -(near + far) / depthSize;
};

// https://www.songho.ca/opengl/gl_projectionmatrix.html
export const mat4Perspective = (horizontalFov: number, aspect: number, near: number, far: number, dst: Mat4) => {
    const depthSize = far - near;
    const right = near * tan(horizontalFov / 2);
    const top = -right / aspect;
    mat4Diagonal(1, dst);
    dst[0] = near / right;
    dst[5] = near / top;
    dst[10] = -(near + far) / depthSize;
    dst[11] = -1;
    dst[14] = -2 * far * near / depthSize;
    dst[15] = 0;
};

export const mat4LookAt = (eye: Vec3, target: Vec3, up: Vec3, dst: Mat4) => {
    //TODO: Replace with vector borrower
    let dir = vec3Splay();
    vecSub(target, eye, dir);
    vecNormalize(dir, dir);
    let side = vec3Splay();
    vec3Cross(dir, up, side);
    vecNormalize(side, side);
    let viewUp = vec3Splay();
    vec3Cross(dir, side, viewUp);
    vecNormalize(viewUp, viewUp);

    mat4Diagonal(1, dst);
    dst[0] = side[0];
    dst[1] = viewUp[0];
    dst[2] = -dir[0];

    dst[4] = side[1];
    dst[5] = viewUp[1];
    dst[6] = -dir[1];

    dst[8] = side[2];
    dst[9] = viewUp[2];
    dst[10] = -dir[2];

    dst[12] = -vecDot(side, eye);
    dst[13] = -vecDot(viewUp, eye);
    dst[14] = vecDot(dir, eye);
};

export const mat4ToConsole = (m: Mat4) => {
    console.log(`-----------------------------------------------`);
    console.log(`| ${m[0].toFixed(4)} ${m[4].toFixed(4)} ${m[8].toFixed(4)} ${m[12].toFixed(4)} |`);
    console.log(`| ${m[1].toFixed(4)} ${m[5].toFixed(4)} ${m[9].toFixed(4)} ${m[13].toFixed(4)} |`);
    console.log(`| ${m[2].toFixed(4)} ${m[6].toFixed(4)} ${m[10].toFixed(4)} ${m[14].toFixed(4)} |`);
    console.log(`| ${m[3].toFixed(4)} ${m[7].toFixed(4)} ${m[11].toFixed(4)} ${m[15].toFixed(4)} |`);
    console.log(`-----------------------------------------------`);
};

/*
    Quaternions are stored as [i,j,k,1]
*/

export const quat = () => {
    return vec4Splay() as Quaternion;
};

export const quatFromAxisAngle = (axis: Vec3, angle: number, r: Quaternion) => {
    const ha = angle / 2;
    r[0] = axis[0] * sin(ha);
    r[1] = axis[1] * sin(ha);
    r[2] = axis[2] * sin(ha);
    r[3] = cos(ha);
};

// Dir must be normalized, 
export const quatFromDirection = (dir: Vec3, r: Quaternion) => {
    //TODO: Borrower!
    if (vecEq(dir, xAxisNeg)) {
        vecCopy(r, identityQuaternion);
        return;
    }
    if (vecEq(dir, xAxis)) {
        quatFromAxisAngle(zAxis, Deg * 180, r);
        return;
    }

    let tmpNormal = vec3Splay();
    vec3Cross(xAxisNeg, dir, tmpNormal);
    vecNormalize(tmpNormal, tmpNormal);
    quatFromAxisAngle(tmpNormal, acos(vecDot(xAxisNeg, dir)), r);
};

export const quatMul = (a: Quaternion, b: Quaternion, r: Quaternion) => {
    assert(a != r);
    assert(b != r);

    r[3] = a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2];
    r[0] = a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1];
    r[1] = a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0];
    r[2] = a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3];
};

export const mat4Vec4Mul = (mat: Mat4, v: Vec4, r: Vec4) => {
    assert(v != r);
    r[0] = mat[0] * v[0] + mat[4] * v[1] + mat[8] * v[2] + mat[12] * v[3];
    r[1] = mat[1] * v[0] + mat[5] * v[1] + mat[9] * v[2] + mat[13] * v[3];
    r[2] = mat[2] * v[0] + mat[6] * v[1] + mat[10] * v[2] + mat[14] * v[3];
    r[3] = mat[3] * v[0] + mat[7] * v[1] + mat[11] * v[2] + mat[15] * v[3];
};


export const xAxis = vec3(1, 0, 0);
export const yAxis = vec3(0, 1, 0);
export const zAxis = vec3(0, 0, 1);
export const xAxisNeg = vec3(-1, 0, 0);
export const yAxisNeg = vec3(0, -1, 0);
export const zAxisNeg = vec3(0, 0, -1);
export const zeroVector: Vec = [0, 0, 0, 0];
export const oneVector: Vec = [1, 1, 1, 1];
export const identityQuaternion: Quaternion = [0, 0, 0, 1];