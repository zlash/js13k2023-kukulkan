import { sdfTexture3d, sdfTextureMaterial3d } from "./renderer";
import { Deg, abs, arrayFromLast, arrayLast, assert, clamp, cos, floor, max, min, mix, saturate, sign, sin, sqrt } from "./aliasedFunctions";
import { Vec2, Vec3, vec2, vec2Rotate, vec2Splay, vec3, vec3Splay, vecAbs, vecClone, vecCopy, vecDot, vecFMKA, vecLength, vecMax, vecMix, vecMulK, vecSub, vecSymmetricClamp, zeroVector } from "./juvec";
import { SdfBuilder } from "./sdfBuilder";
import * as SdfBuilderOps from "./sdfBuilderOps";
import { texture3dSubdata } from "./webgl";
import { sdfSpritesAtlasSide } from "./constants";
import { loadingData } from "~loadingScreen";

// From: https://iquilezles.org/articles/distfunctions2d/


export const sdf2dPman = (pos: Vec2, aperture: number, r: number) => {
    // Borrow! 
    const p = vec2(abs(pos[0]), pos[1]);
    const l = vecLength(p) - r;
    // Borrow!
    const cs = vec2(sin(aperture), cos(aperture));

    const s = sign(cs[1] * p[0] - cs[0] * p[1]);

    vecFMKA(cs, -clamp(vecDot(p, cs), 0, r), p, p);
    const m = vecLength(p);
    return max(l, m * s);
};

export const extrusion = (sdf: number, p: Vec3, h: number) => {
    // Borrow!
    const w = vec2(sdf, abs(p[2]) - h);
    const minMax = min(max(w[0], w[1]), 0.0);
    vecMax(w, zeroVector, w);
    return minMax + vecLength(w);
}

export const sdfMap = (sdf: SdfBuilder, pos: Vec3) => {
    const buf = sdf.buf;

    const sdfStack: Vec2[] = [];
    const posStack: Vec3[] = [pos];
    const materialStack: number[] = [];
    const scaleStack: number[] = [];
    const onionStack: number[] = [];

    let tmpVec2a = vec2Splay();
    let tmpVec2b = vec2Splay();
    let tmpVec3a = vec3Splay();

    const vec3FromBuf = (idx: number) => vec3(buf[idx], buf[idx + 1], buf[idx + 2]);

    const pushSdfAndMat = (d: number) => {
        sdfStack.push(vec2(d, arrayLast(materialStack)));
    };

    for (let cellIdx = 0; cellIdx < sdf.pos; ++cellIdx) {
        const bIdx = cellIdx * 4;
        assert(buf[bIdx] > 0);
        switch (buf[bIdx]) {
            // Shapes
            case SdfBuilderOps.Sphere:
                pushSdfAndMat(vecLength(arrayLast(posStack)) - buf[bIdx + 1]);
                break;
            case SdfBuilderOps.Box: {
                vecAbs(arrayLast(posStack), tmpVec3a);
                vecSub(tmpVec3a, vec3FromBuf(bIdx + 1), tmpVec3a);
                vecMax(tmpVec3a, zeroVector, tmpVec3a);
                pushSdfAndMat(vecLength(tmpVec3a) + min(max(tmpVec3a[0], max(tmpVec3a[1], tmpVec3a[2])), 0.0));
                break;
            }
            case SdfBuilderOps.Cylinder: {
                const p = arrayLast(posStack);
                const sdf = sqrt(p[0] * p[0] + p[1] * p[1]) - buf[bIdx + 1];
                pushSdfAndMat(extrusion(sdf, p, buf[bIdx + 2]));
                break;
            }
            case SdfBuilderOps.PMan: {
                const p = arrayLast(posStack);
                //const sdf = sqrt(p[0] * p[0] + p[1] * p[1]) - buf[bIdx + 2];
                const sdf = sdf2dPman(p as any as Vec2, buf[bIdx + 1] * Deg, buf[bIdx + 2]);
                pushSdfAndMat(extrusion(sdf, p, buf[bIdx + 3]));
                break;
            }

            // Combinations
            case SdfBuilderOps.Union: {
                const sdfA = sdfStack.pop() as Vec2;
                const sdfB = sdfStack.pop() as Vec2;
                sdfStack.push(sdfA[0] < sdfB[0] ? sdfA : sdfB);
                break;
            }

            case SdfBuilderOps.SmoothUnion: {
                const sdfA = sdfStack.pop() as Vec2;
                const sdfB = sdfStack.pop() as Vec2;

                const d1 = sdfB[0];
                const d2 = sdfA[0];
                const k = buf[bIdx + 1];
                const h = saturate(0.5 + 0.5 * (d2 - d1) / k);
                sdfStack.push([mix(d2, d1, h) - k * h * (1.0 - h), sdfA[1]]);
                break;
            }

            case SdfBuilderOps.Subtract: {
                const sdfA = sdfStack.pop() as Vec2;
                const sdfB = sdfStack.pop() as Vec2;
                sdfB[0] *= -1;
                sdfB[1] = sdfA[1];
                sdfStack.push(sdfA[0] > sdfB[0] ? sdfA : sdfB);
                break;
            }

            case SdfBuilderOps.SmoothSubtract: {
                const sdfA = sdfStack.pop() as Vec2;
                const sdfB = sdfStack.pop() as Vec2;

                const d1 = sdfB[0];
                const d2 = sdfA[0];
                const k = buf[bIdx + 1];
                const h = saturate(0.5 - 0.5 * (d2 + d1) / k);
                sdfStack.push([mix(d2, -d1, h) + k * h * (1.0 - h), sdfA[1]]);
                break;
            }

            case SdfBuilderOps.Intersect: {
                const sdfA = sdfStack.pop() as Vec2;
                const sdfB = sdfStack.pop() as Vec2;
                sdfB[1] = sdfA[1];
                sdfStack.push(sdfA[0] > sdfB[0] ? sdfA : sdfB);
                break;
            }

            // Transforms
            case SdfBuilderOps.Translate:
                posStack.push(vec3Splay());
                vecSub(arrayFromLast(posStack, 1), vec3FromBuf(bIdx + 1), arrayLast(posStack));
                break;
            case SdfBuilderOps.RotateXY: {
                const curPos = arrayLast(posStack);
                vec2Rotate(curPos as unknown as Vec2, -buf[bIdx + 1], tmpVec2b);
                posStack.push(vec3(tmpVec2b[0], tmpVec2b[1], curPos[2]));
                break;
            }
            case SdfBuilderOps.RotateXZ: {
                const curPos = arrayLast(posStack);
                tmpVec2a[0] = curPos[0];
                tmpVec2a[1] = curPos[2];
                vec2Rotate(tmpVec2a, -buf[bIdx + 1], tmpVec2b);
                posStack.push(vec3(tmpVec2b[0], curPos[1], tmpVec2b[1]));
                break;
            }
            case SdfBuilderOps.RotateYZ: {
                const curPos = arrayLast(posStack);
                tmpVec2a[0] = curPos[1];
                tmpVec2a[1] = curPos[2];
                vec2Rotate(tmpVec2a, -buf[bIdx + 1], tmpVec2b);
                posStack.push(vec3(curPos[0], tmpVec2b[0], tmpVec2b[1]));
                break;
            }
            case SdfBuilderOps.Elongate: {
                const prevPos = arrayLast(posStack);
                posStack.push(vec3Splay());
                const newPos = arrayLast(posStack);
                vecSymmetricClamp(prevPos, vec3FromBuf(bIdx + 1), newPos);
                vecSub(prevPos, newPos, newPos);
                break;
            }
            case SdfBuilderOps.PopTranslationRotation:
                posStack.pop();
                break;
            case SdfBuilderOps.Scale:
                scaleStack.push(buf[bIdx + 1]);
                posStack.push(vec3Splay());
                vecMulK(arrayFromLast(posStack, 1), 1 / arrayLast(scaleStack), arrayLast(posStack));
                break;
            case SdfBuilderOps.PopScale:
                posStack.pop();
                arrayLast(sdfStack)[0] *= arrayLast(scaleStack);
                scaleStack.pop();
                break;
            case SdfBuilderOps.Smooth:
                arrayLast(sdfStack)[0] -= buf[bIdx + 1];
                break;
            case SdfBuilderOps.Symmetry: {
                posStack.push(vecClone(arrayLast(posStack)));
                const newPos = arrayLast(posStack);
                if (buf[bIdx + 1] == 1.0) {
                    newPos[0] = abs(newPos[0]);
                }
                if (buf[bIdx + 2] == 1.0) {
                    newPos[1] = abs(newPos[1]);
                }
                if (buf[bIdx + 3] == 1.0) {
                    newPos[2] = abs(newPos[2]);
                }
                break;
            }

            case SdfBuilderOps.Onion:
                onionStack.push(buf[bIdx + 1]);
                break;
            case SdfBuilderOps.PopOnion:
                arrayLast(sdfStack)[0] = abs(arrayLast(sdfStack)[0]) - arrayLast(onionStack);
                onionStack.pop();
                break;


            // Materials
            case SdfBuilderOps.PushMaterial:
                materialStack.push(buf[bIdx + 1]);
                break;
            // Keep outermost material around for 
            // easier authoring
            case SdfBuilderOps.PopMaterial:
                if (materialStack.length > 1) {
                    materialStack.pop();
                }
                break;
        }
    }
    assert(sdfStack.length == 1);
    return arrayLast(sdfStack);
};

export const sdfBakeMap = async (sdf: SdfBuilder, size: number) => {
    const buf = new Float32Array(size * size * size);
    const materialBuf = new Float32Array(size * size * size);

    const halfPixel = 1 / (2 * size);
    const size_1 = size - 1;

    const renderZLayerAsync = (z: number) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                const zp = z * size * size;
                const zu = (2 * (halfPixel + z / size_1)) - 1;
                for (let y = 0; y < size; ++y) {
                    const yp = y * size;
                    const yu = (2 * (halfPixel + y / size_1)) - 1;
                    for (let x = 0; x < size; ++x) {
                        const xu = (2 * (halfPixel + x / size_1)) - 1;
                        const pos = vec3(xu, yu, zu);
                        if (vecLength(pos) < 1.1) {
                            const idx = zp + yp + x;
                            [buf[idx], materialBuf[idx]] = sdfMap(sdf, pos);
                        }
                    }
                }
                resolve(true);
            });
        });
    };

    for (let z = 0; z < size; ++z) {
        await renderZLayerAsync(z);
    }

    return [buf, materialBuf];
};

export const sdfBakeToTexture = async (sdf: SdfBuilder, id: number) => {
    ++loadingData.toLoad;
    const [buf, materialBuf] = await sdfBakeMap(sdf, sdfTexture3d.d);
    ++loadingData.loaded;
    const y = floor(id / sdfSpritesAtlasSide);
    const x = id - y * sdfSpritesAtlasSide;
    texture3dSubdata(sdfTexture3d, x * sdfTexture3d.d, y * sdfTexture3d.d, buf);
    texture3dSubdata(sdfTextureMaterial3d, x * sdfTexture3d.d, y * sdfTexture3d.d, materialBuf);
}