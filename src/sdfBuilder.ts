import { Deg, assert } from "~aliasedFunctions";
import * as SdfBuilderOps from "./sdfBuilderOps";

// Cells are four float numbers for better interchangeability with the GPU
export const sdfCells = 512;

export interface SdfBuilder {
    pos: number;
    buf: Float32Array;
    pushCell: (x?: number, y?: number, z?: number, w?: number) => void;
    pushSdf: (sdfB: SdfBuilder) => void;
    clone: () => SdfBuilder;
    union: (...sdfs: SdfBuilder[]) => SdfBuilder;
    smoothUnion: (sdfB: SdfBuilder, k: number) => SdfBuilder;
    subtract: (sdfB: SdfBuilder) => SdfBuilder;
    smoothSubtract: (sdfB: SdfBuilder, k: number) => SdfBuilder;
    intersect: (sdfB: SdfBuilder) => SdfBuilder;
    translate: (x?: number, y?: number, z?: number) => SdfBuilder;
    elongate: (x?: number, y?: number, z?: number) => SdfBuilder;
    rotateXY: (angle: number) => SdfBuilder;
    rotateXZ: (angle: number) => SdfBuilder;
    rotateYZ: (angle: number) => SdfBuilder;
    scale: (scale: number) => SdfBuilder;
    smooth: (k: number) => SdfBuilder;
    symmetry: (x?: number, y?: number, z?: number) => SdfBuilder;
    onion: (thickness: number) => SdfBuilder;
    setMaterial: (material: number) => SdfBuilder;
};

export const createSdf = (x_?: number, y_?: number, z_?: number, w_?: number): SdfBuilder => {
    const sdf = {
        pos: 0, // Cell pos
        buf: new Float32Array(sdfCells * 4),
    } as unknown as SdfBuilder;

    sdf.pushCell = (x?: number, y?: number, z?: number, w?: number) => {
        // We abuse that js casts non numbers to nan when assigning to the buffer
        const bufPos = sdf.pos * 4;
        sdf.buf[bufPos] = x as any;
        sdf.buf[bufPos + 1] = y as any;
        sdf.buf[bufPos + 2] = z as any;
        sdf.buf[bufPos + 3] = w as any;
        ++sdf.pos;
    };

    sdf.pushSdf = (sdfB: SdfBuilder) => {
        const srcArr = sdfB.buf.subarray(0, sdfB.pos * 4);
        sdf.buf.set(srcArr, sdf.pos * 4);
        sdf.pos += sdfB.pos;
    };

    sdf.clone = () => {
        const newSdf = createSdf();
        newSdf.pushSdf(sdf);
        return newSdf;
    };

    sdf.smoothUnion = (sdfB: SdfBuilder, k: number) => {
        const newSdf = sdfB.clone();
        newSdf.pushSdf(sdf);
        newSdf.pushCell(SdfBuilderOps.SmoothUnion, k);
        return newSdf;
    };

    sdf.union = (...sdfs: SdfBuilder[]) => {
        const newSdf = sdf.clone();
        for (let sdfB of sdfs) {
            newSdf.pushSdf(sdfB);
            newSdf.pushCell(SdfBuilderOps.Union);
        }
        return newSdf;
    };

    sdf.subtract = (sdfB: SdfBuilder) => {
        const newSdf = sdfB.clone();
        newSdf.pushSdf(sdf);
        newSdf.pushCell(SdfBuilderOps.Subtract);
        return newSdf;
    };

    sdf.smoothSubtract = (sdfB: SdfBuilder, k: number) => {
        const newSdf = sdfB.clone();
        newSdf.pushSdf(sdf);
        newSdf.pushCell(SdfBuilderOps.SmoothSubtract, k);
        return newSdf;
    };

    sdf.intersect = (sdfB: SdfBuilder) => {
        const newSdf = sdfB.clone();
        newSdf.pushSdf(sdf);
        newSdf.pushCell(SdfBuilderOps.Intersect);
        return newSdf;
    };

    const transform = (type: number, x?: number, y?: number, z?: number) => {
        const newSdf = createSdf();
        newSdf.pushCell(type, x ?? 0, y ?? 0, z ?? 0);
        newSdf.pushSdf(sdf);
        newSdf.pushCell(SdfBuilderOps.PopTranslationRotation);
        return newSdf;
    }

    sdf.translate = (x?: number, y?: number, z?: number) => {
        return transform(SdfBuilderOps.Translate, x, y, z);
    };

    sdf.elongate = (x?: number, y?: number, z?: number) => {
        return transform(SdfBuilderOps.Elongate, x, y, z);
    };

    sdf.rotateXY = (angle: number) => {
        return transform(SdfBuilderOps.RotateXY, -angle * Deg);
    };

    sdf.rotateXZ = (angle: number) => {
        return transform(SdfBuilderOps.RotateXZ, -angle * Deg);
    };

    sdf.rotateYZ = (angle: number) => {
        return transform(SdfBuilderOps.RotateYZ, -angle * Deg);
    };

    sdf.smooth = (k: number) => {
        const newSdf = sdf.clone();
        newSdf.pushCell(SdfBuilderOps.Smooth, k);
        return newSdf;
    }

    sdf.scale = (scale: number) => {
        const newSdf = createSdf();
        newSdf.pushCell(SdfBuilderOps.Scale, scale);
        newSdf.pushSdf(sdf);
        newSdf.pushCell(SdfBuilderOps.PopScale);
        return newSdf;
    };

    sdf.symmetry = (x?: number, y?: number, z?: number) => {
        return transform(SdfBuilderOps.Symmetry, x, y, z);
    };

    sdf.onion = (thickness: number) => {
        const newSdf = createSdf();
        newSdf.pushCell(SdfBuilderOps.Onion, thickness);
        newSdf.pushSdf(sdf);
        newSdf.pushCell(SdfBuilderOps.PopOnion);
        return newSdf;
    };


    sdf.setMaterial = (material: number) => {
        const newSdf = createSdf();
        newSdf.pushCell(SdfBuilderOps.PushMaterial, material);
        newSdf.pushSdf(sdf);
        newSdf.pushCell(SdfBuilderOps.PopMaterial);
        return newSdf;
    };

    if (x_ != undefined) {
        sdf.pushCell(x_, y_, z_, w_);
    }

    return sdf;
};

export const createSphere = (r: number) => {
    return createSdf(SdfBuilderOps.Sphere, r);
};

export const createBox = (xr: number, yr: number, zr: number) => {
    return createSdf(SdfBuilderOps.Box, xr, yr, zr);
};

export const createCylinder = (r: number, hz: number) => {
    return createSdf(SdfBuilderOps.Cylinder, r, hz);
};