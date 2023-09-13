import { addEntity, Boss, gameArea, GameEntity, gameEntityDefaultCreate, hpBar, player, ShapeTypeCircle, ShapeTypeNone } from "~game";
import { EntityBoss, EntityBossBulletSolid, EntityBossDieded, EntityHelper } from "~gameEntityTypes";
import { drawSdfSprite } from "~renderer";
import { identityQuaternion, quat, quatFromAxisAngle, quatMul, Vec2, vec2, vec2Rotate, vec2Splay, Vec3, vec3, vec3Splay, vecAdd, vecClone, vecCopy, vecDot, vecFMKA, vecLength, vecMulK, vecSet, vecSub, xAxis, yAxis, zAxis, zAxisNeg } from "./juvec";
import * as SdfSpriteIndices from "./sdfSpriteIndices";
import { playSample } from "~audio";
import * as SfxIds from "./sfxIds";
import { setGameOverlayMode, GameScreenOverlayModeSelectUpgrade } from "~gameScreenOverlay";
import { cos, Deg, floor, fract, max, min, mix, Pi, plateau, pow, powerCurve, remap, sin, smoothstep, smoothstepMix } from "~aliasedFunctions";
import { R8I } from "~webglEnums";
import { NahuiOllinOrbRadius } from "~nahuiOllin";
import { timeOfDay } from "~gameSession";

export const CalliTRadius = 1;


export const CalliModelSide = 4;
export const CalliBarrierRadius = CalliModelSide * 0.15;
export const CalliModelTThickRad = 0.3;
export const CalliModelBottomThick = (CalliModelSide - 2 + 2 * CalliModelTThickRad) / 2;
export const CalliModelXOffset = 0.5;

export const CalliTSpriteScale = 0.5;

export const CalliTopSpriteScale = 0.35;
export const CalliModelTopOffset = vec2(CalliModelXOffset, 1 + CalliModelBottomThick / 2 - 2 * CalliModelTThickRad);

export const CalliBottomSpriteScale = 0.45;
export const CalliModelBottomOffset = vec2(CalliModelXOffset, -1 - CalliModelBottomThick / 2);


export const CalliDominoSlabHRadius = 2;
export const CalliDominoSlabHRadiusRatio = 0.5;
export const CalliDominoSlabSpriteScale = 0.5;


interface Calli extends Boss {
};

interface CalliCoreBarrier extends Boss {
    gridOffset: Vec2;
};

interface CalliDomino extends Boss {
    clock: number;
};

export const createCalli = () => {
    const ModeIdle = 0;
    const ModeDied = 3;

    const HitFxDuration = 0.2;

    const e = gameEntityDefaultCreate(EntityBoss) as Calli;
    e.shapeType = ShapeTypeCircle;
    e.shapeRadius = CalliTRadius;
    vecSet(e.pos, 0, 6, 0);

    let mode: number;
    let clock: number;

    let hitFxTimer = 0;
    const maxHps = [12, 20];
    let curHp = maxHps[0];
    let stage = 0;

    const dominoRiseClockDivisor = [1.8, 1, 0.6][timeOfDay];
    let curAngle = 0;

    hpBar.reset(curHp);

    let coreBarriers = [] as CalliCoreBarrier[];

    for (let yi = -1; yi < 2; ++yi) {
        for (let xi = -1; xi < 2; ++xi) {
            if (yi == 0 && xi < 1) {
                continue;
            }
            const p = gameEntityDefaultCreate(EntityBoss) as CalliCoreBarrier;
            p.shapeType = ShapeTypeCircle;
            p.shapeRadius = CalliBarrierRadius;
            p.gridOffset = vec2(xi, yi);
            addEntity(p);
            coreBarriers.push(p);
        }
    }

    const slabsNH = 7;
    const slabsNV = 5;

    let dominoEnterClock = 0;
    let dominoRiseClock = 0;
    let dominoes = [] as CalliDomino[];


    const spawnSlabHitzones = (rad: number) => {
        const hitzones = [] as GameEntity[];
        for (let i = 0; i < 2; ++i) {
            let hz = gameEntityDefaultCreate(EntityBossBulletSolid);
            hz.shapeType = ShapeTypeCircle;
            hz.shapeRadius = rad;
            /*             hz.render = () => {
                            if (hz.shapeType == ShapeTypeCircle) {
                                drawSdfSprite(SdfSpriteIndices.NahuiOllinOrb, hz.pos, rad / NahuiOllinOrbRadius, identityQuaternion);
                            }
                        }; */
            addEntity(hz);
            hitzones.push(hz);
        }
        return hitzones;
    };

    let tatsumakiSenpuuKyakuDominoWRadius = 0.75;
    let tatsumakiSenpuuKyakuPrevMovementRadius = 9;
    let tatsumakiSenpuuKyakuMovementRadius = 9;
    let tatsumakiSenpuuKyaku = gameEntityDefaultCreate(EntityHelper) as CalliDomino;
    let tatsumakiSenpuuKyakuHitzones = spawnSlabHitzones(tatsumakiSenpuuKyakuDominoWRadius);
    let tatsumakiSenpuuKyakuClock = 0;

    addEntity(tatsumakiSenpuuKyaku);

    const spawnDominoesPlease = () => {
        for (let yi = 0; yi < slabsNV; ++yi) {
            for (let xi = floor(yi / 3); xi < min(slabsNH, slabsNH - 3 + yi); ++xi) {
                const p = gameEntityDefaultCreate(EntityHelper) as CalliDomino;
                const rotated = yi & 1;
                const rot = vecClone(identityQuaternion);
                if (rotated) {
                    vecSet(p.pos, (xi + 0.5 - slabsNH / 2) * (CalliDominoSlabHRadius * CalliDominoSlabHRadiusRatio * 2) + (CalliDominoSlabHRadius - CalliDominoSlabHRadius * CalliDominoSlabHRadiusRatio), (yi + 0.25 - slabsNV / 2 - xi * 0.5) * (CalliDominoSlabHRadius * 2));
                } else {
                    vecSet(p.pos, (xi + 0.5 - slabsNH / 2) * (CalliDominoSlabHRadius * CalliDominoSlabHRadiusRatio * 2), (yi + 0.5 - slabsNV / 2 - xi * 0.5) * (CalliDominoSlabHRadius * 2));
                    quatFromAxisAngle(zAxis, Deg * 90, rot);
                }

                p.pos[1] += 3;
                let angle = 0;
                p.clock = 0;

                const finalPos = vecClone(p.pos);
                p.pos[0] = -100;

                const hitzoneRad = 1;
                const hitzones = spawnSlabHitzones(hitzoneRad);
                hitzones[0].shapeType = hitzones[1].shapeType = ShapeTypeNone;

                p.update = (dts: number) => {
                    if (p.clock > 0) {
                        p.clock += dts / 4;
                    }
                    if (p.clock >= 1) {
                        p.clock = 0;
                    }

                    const k = plateau(fract(p.clock), 0.6, 0.15);
                    angle = Deg * 180 * k;
                    p.pos[2] = mix(-3.5, 0, pow(k, 10));

                    p.pos[0] = smoothstepMix(-20, finalPos[0], dominoEnterClock);

                    for (let i = 0; i < 2; ++i) {
                        const hz = hitzones[i];
                        hz.shapeType = k >= 0.99 ? ShapeTypeCircle : ShapeTypeNone;
                        vecFMKA(rotated ? xAxis : yAxis, 0.9 * hitzoneRad * (i * 2 - 1), p.pos, hz.pos);
                    }

                };
                const dstQuat = quat();
                const localRotation = quat();
                p.render = () => {
                    quatFromAxisAngle(yAxis, angle, localRotation);
                    quatMul(rot, localRotation, dstQuat);
                    drawSdfSprite(SdfSpriteIndices.CalliDominoSlab, p.pos, CalliDominoSlabHRadius / CalliDominoSlabSpriteScale, dstQuat);
                };
                addEntity(p);
                dominoes.push(p);
            }
        }
    };



    const setMode = (nextMode: number) => {
        clock = 0;

        if (nextMode == ModeDied) {
            e.type = EntityBossDieded;
            setGameOverlayMode(GameScreenOverlayModeSelectUpgrade);
        }

        mode = nextMode;
    }

    setMode(ModeIdle);

    let tmskQ = quat();
    let tmskV = vec2Splay();

    e.update = (dts: number) => {
        clock += dts;
        hitFxTimer = max(0, hitFxTimer - dts);

        curAngle = clock * 0.6;

        e.pos[0] = gameArea[0] * 0.9 * sin(clock / 2);

        for (let i = 0; i < coreBarriers.length; ++i) {
            const p = coreBarriers[i];
            const barriersRadius = 1.5;

            vec2Rotate(p.gridOffset, curAngle, p.pos as any as Vec2);
            vecMulK(p.pos, barriersRadius, p.pos);
            vecAdd(p.pos, e.pos, p.pos);
        }

        tatsumakiSenpuuKyakuClock += dts / 5;

        if (tatsumakiSenpuuKyakuClock >= 1) {
            tatsumakiSenpuuKyakuClock -= 1;
            tatsumakiSenpuuKyakuPrevMovementRadius = tatsumakiSenpuuKyakuMovementRadius;
            const tmp = vec3(0, gameArea[1], 0);
            vecSub(tmp, player.pos, tmp);
            tatsumakiSenpuuKyakuMovementRadius = max(9, vecLength(tmp));
        }

        const tmskMovAngle = tatsumakiSenpuuKyakuClock * 2 * Pi;
        const tmskRotAngle = tatsumakiSenpuuKyakuClock * 2 * Pi * 12;
        quatFromAxisAngle(zAxis, tmskRotAngle, tmskQ);

        const tmskRadius = mix(tatsumakiSenpuuKyakuPrevMovementRadius, tatsumakiSenpuuKyakuMovementRadius, smoothstep(0, 0.5, tatsumakiSenpuuKyakuClock));

        tatsumakiSenpuuKyaku.pos[0] = tmskRadius * cos(tmskMovAngle);
        tatsumakiSenpuuKyaku.pos[1] = gameArea[1] + tmskRadius * sin(tmskMovAngle);

        drawSdfSprite(SdfSpriteIndices.CalliDominoSlab, tatsumakiSenpuuKyaku.pos, 2 * tatsumakiSenpuuKyakuDominoWRadius / CalliDominoSlabSpriteScale, tmskQ);

        vec2Rotate(xAxis as any as Vec2, -tmskRotAngle, tmskV);
        for (let i = 0; i < 2; ++i) {
            const hz = tatsumakiSenpuuKyakuHitzones[i];
            vecFMKA(tmskV as any as Vec3, 0.9 * tatsumakiSenpuuKyakuDominoWRadius * (i * 2 - 1), tatsumakiSenpuuKyaku.pos, hz.pos);
        }

        if (stage > 0) {
            dominoRiseClock += dts / dominoRiseClockDivisor;
            dominoEnterClock += dts;
        }

        if (dominoEnterClock > 1 && dominoRiseClock >= 1) {
            dominoRiseClock -= 1;
            // Raise next domino
            const tmpVec = vec3Splay();
            dominoes.sort((a, b) => {
                vecSub(a.pos, player.pos, tmpVec);
                const dA = vecDot(tmpVec, tmpVec);
                vecSub(b.pos, player.pos, tmpVec);
                const dB = vecDot(tmpVec, tmpVec);
                return dA - dB;
            });
            for (let i = 0; i < dominoes.length; ++i) {
                if (dominoes[i].clock <= 0) {
                    dominoes[i].clock = 0.001;
                    break;
                }
            }
        }
    };

    e.hit = () => {
        if (mode != ModeDied) {
            --curHp;
            if (curHp <= 0) {
                ++stage;
                if (stage == 1) {
                    spawnDominoesPlease();
                }
                if (stage == 2) {
                    setMode(ModeDied);
                }
                else {
                    curHp += maxHps[stage];
                    hpBar.reset(curHp);
                }
            }
            hpBar.updateCurrent(curHp);
            hitFxTimer = HitFxDuration;
            playSample(SfxIds.HIT);
        }
    };

    e.render = () => {
        if (mode == ModeDied) {
            return;
        }
        // Borrow
        const q = quat();
        quatFromAxisAngle(zAxisNeg, curAngle, q);
        drawSdfSprite(SdfSpriteIndices.CalliT, e.pos, CalliTRadius / CalliTSpriteScale, q, 0, hitFxTimer / HitFxDuration);

        const topPos = vec2Splay();
        vec2Rotate(CalliModelTopOffset, curAngle, topPos);
        //const topPos = vecClone(CalliModelTopOffset);
        vecMulK(topPos, CalliTRadius, topPos);
        vecAdd(e.pos as any as Vec2, topPos, topPos);

        drawSdfSprite(SdfSpriteIndices.CalliTop, topPos as any as Vec3, CalliTRadius / CalliTopSpriteScale, q);

        const bottomPos = vec2Splay();
        vec2Rotate(CalliModelBottomOffset, curAngle, bottomPos);
        //const topPos = vecClone(CalliModelTopOffset);
        vecMulK(bottomPos, CalliTRadius, bottomPos);
        vecAdd(e.pos as any as Vec2, bottomPos, bottomPos);

        drawSdfSprite(SdfSpriteIndices.CalliBottom, bottomPos as any as Vec3, CalliTRadius / CalliBottomSpriteScale, q);
    };

    return e;

};