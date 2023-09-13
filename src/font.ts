/*
    Each line is defined between two points of a 3 * 3 grid
    6 7 8
    3 4 5
    0 1 2
*/

import { assert, atan2, floor, randomRange } from "~aliasedFunctions";
import { Vec2, Vec4, vec2, vec2Splay, vecClone, vecFMKA, vecLength, vecSub, zeroVector } from "./juvec";
import { drawOrtho2d } from "./renderer";

// From 48
const fontNumbers = [
    [[3, 7], [5, 7], [1, 5], [1, 3], [0, 8]], // 0
    [[3, 7], [1, 7]], // 1
    [[3, 7], [5, 7], [0, 5], [0, 2]], // 2
    [[5, 6], [3, 5], [0, 5]], // 3
    [[3, 7], [3, 5], [2, 8]], // 4
    [[6, 8], [3, 6], [3, 5], [1, 5], [0, 1]], // 5 
    [[3, 7], [1, 3], [1, 5], [4, 5], [0, 4]], // 6
    [[6, 8], [0, 8]], // 7 
    [[6, 8], [0, 8], [2, 6], [0, 2]], // 8 
    [[2, 5], [5, 7], [3, 7], [3, 5]], // 9
];

// From 65
const font = [
    [[0, 7], [2, 7], [3, 5]], // A
    [[6, 8], [4, 8], [3, 4], [2, 4], [0, 2], [0, 6]], // B
    [[3, 8], [2, 3]], // C
    [[5, 6], [0, 5], [0, 6]], // D
    [[3, 8], [3, 5], [2, 3]], // E
    [[6, 8], [3, 4], [0, 6]], // F
    [[3, 7], [1, 3], [1, 5], [4, 5], [7, 8]], // G
    [[0, 6], [3, 5], [2, 8]], // H
    [[1, 7]], // I
    [[1, 3], [1, 7]], // J
    [[3, 8], [2, 3], [0, 6]], // K
    [[0, 6], [0, 1]], // L
    [[0, 6], [4, 6], [4, 8], [2, 8]], // M
    [[0, 6], [2, 6], [2, 8]], // N
    [[3, 7], [5, 7], [1, 5], [1, 3]], // O
    [[0, 6], [3, 5], [5, 6]], // P
    [[3, 7], [5, 7], [1, 5], [1, 3], [2, 4]], // Q
    [[0, 6], [3, 5], [5, 6], [2, 3]], // R
    [[3, 7], [3, 5], [1, 5]], // S
    [[6, 8], [1, 7]], // T
    [[0, 6], [0, 2], [2, 8]], // U
    [[1, 6], [1, 8]], // V
    [[0, 6], [0, 4], [2, 4], [2, 8]], // W
    [[0, 8], [2, 6]], // X
    [[4, 6], [4, 8], [1, 4]], // Y
    [[6, 8], [0, 8], [0, 2]], // Z
];

const characterAspectRatio = 0.75;
const interletterSpaceRatio = 0.1;

const rectAsLine = (p0: Vec2, p1: Vec2, r: number, color?: Vec4) => {
    r = 2 * r;
    // borrow!
    let dir = vec2Splay();
    vecSub(p1, p0, dir);
    const dirLen = vecLength(dir);
    // borrow!
    let pos = vec2Splay();
    vecFMKA(dir, 0.5, p0, pos);

    const rand = randomRange(0.8, 1.2);

    drawOrtho2d(pos, vec2(dirLen * rand + r, r), zeroVector as Vec2, zeroVector as Vec2, 0, atan2(dir[1], dir[0]) + randomRange(-0.1, 0.1), color);
};

export const renderText = (text: string, pos: Vec2, lineHeight: number, center?: boolean, color?: Vec4) => {
    let curPos = vecClone(pos);
    const size = vec2(lineHeight * characterAspectRatio, lineHeight);
    const xAdvance = (interletterSpaceRatio + characterAspectRatio) * lineHeight;
    const r = lineHeight * 0.05;

    const textLength = text.length;

    if (center) {
        curPos[0] -= textLength * xAdvance / 2;
    }

    const pFromId = (id: number) => {
        let y = floor(id / 3);
        let x = id - y * 3;
        // Smudge lines around for stylistic purposes 
        if (y == 1) y -= 0.2;
        // borrow!
        return vec2(x * size[0] / 3 + curPos[0], y * size[1] / 3 + curPos[1]);
    };

    for (let i = 0; i < textLength; ++i) {
        const charId = text.charCodeAt(i) - 65;
        if (charId != -33) {
            let char;
            if (charId >= -17 && charId < -7) {
                char = fontNumbers[charId + 17];
            } else {
                assert(charId >= 0 && charId < font.length, "Character not in font!");
                char = font[charId];
            }
            for (let j = 0; j < char.length; ++j) {
                let p0 = pFromId(char[j][0]);
                let p1 = pFromId(char[j][1]);
                rectAsLine(p0, p1, r, color);
            }
        }
        curPos[0] += xAdvance;
    }

};