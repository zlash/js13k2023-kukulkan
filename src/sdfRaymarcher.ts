import { SdfBuilder } from "./sdfBuilder";
import { Vec3, vec3, vec3Cross, vec3Splay, vecAdd, vecDot, vecMulK, vecNormalize, vecReset, zAxis } from "./juvec";
import { sdfMap } from "./sdfMapper";
import { abs, saturate } from "./aliasedFunctions";

const MaxSteps = 256;
const MaxDist = 15;
const SurfDist = 0.0001;

export const raymarchSdf = (sdf: SdfBuilder, ro: Vec3, rd: Vec3) => {
    let d0 = 0;
    let p = vec3Splay();
    for (let i = 0; i < MaxSteps; ++i) {
        vecMulK(rd, d0, p);
        vecAdd(p, ro, p);
        let d = sdfMap(sdf, p)[0];
        if (d0 > MaxDist || abs(d) < SurfDist) {
            break;
        }
        d0 += d;
    }
    return d0;
};

// https://iquilezles.org/articles/normalsSDF
const calcNormal = (sdf: SdfBuilder, pos: Vec3, normal: Vec3) => {
    const e = 0.5773;
    const eps = 0.0005;

    let tmp = vec3Splay();

    vecReset(normal);

    vecAdd(pos, vec3(e * eps, -e * eps, -e * eps), tmp);
    vecMulK(vec3(e, -e, -e), sdfMap(sdf, tmp)[0], tmp);
    vecAdd(normal, tmp, normal);

    vecAdd(pos, vec3(-e * eps, -e * eps, e * eps), tmp);
    vecMulK(vec3(-e, -e, e), sdfMap(sdf, tmp)[0], tmp);
    vecAdd(normal, tmp, normal);

    vecAdd(pos, vec3(-e * eps, e * eps, -e * eps), tmp);
    vecMulK(vec3(-e, e, -e), sdfMap(sdf, tmp)[0], tmp);
    vecAdd(normal, tmp, normal);

    vecAdd(pos, vec3(e * eps, e * eps, e * eps), tmp);
    vecMulK(vec3(e, e, e), sdfMap(sdf, tmp)[0], tmp);
    vecAdd(normal, tmp, normal);

    vecNormalize(normal, normal);
};

// Ortho view
export const raymarchImage = (sdf: SdfBuilder, w: number, origin: Vec3, dir: Vec3, viewplaneSize: number) => {
    console.time("raymarchImage");
    console.log(sdf.buf);
    let buf = new Float32Array(w * w * 3);
    let ro = vec3Splay();
    let tmp = vec3Splay();
    let pos = vec3Splay();
    let normal = vec3Splay();

    const difDir = vec3(0.7, 0.4,0.6);
    const difColor = vec3(0.8, 0.7, 0.5);
    const ambColor = vec3(0.1, 0.2, 0.3);

    const viewRight = vec3Splay();
    vec3Cross(dir, zAxis, viewRight);
    const viewUp = vec3Splay();
    vec3Cross(dir, viewRight, viewUp);

    for (let py = 0; py < w; ++py) {
        for (let px = 0; px < w; ++px) {
            vecMulK(viewRight, viewplaneSize * ((2 * px / (w - 1)) - 1), tmp);
            vecAdd(origin, tmp, ro);
            vecMulK(viewUp, viewplaneSize * ((2 * py / (w - 1)) - 1), tmp);
            vecAdd(ro, tmp, ro);
            const d = raymarchSdf(sdf, ro, dir);
            let color = vec3Splay();
            if (d < MaxDist) {
                vecMulK(dir, d, pos);
                vecAdd(pos, ro, pos);
                calcNormal(sdf, pos, normal);
                const dif = saturate(vecDot(normal, difDir));
                vecMulK(difColor, dif, color);
                vecAdd(color, ambColor, color);
            }
            const bufIdx = (py * w + px) * 3;
            buf[bufIdx] = color[0];
            buf[bufIdx + 1] = color[1];
            buf[bufIdx + 2] = color[2];
        }
    }
    console.timeEnd("raymarchImage");
    return buf;
};
