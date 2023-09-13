import { Boss, ShapeTypeCircle, ShapeTypeNone, addEntity, gameArea, gameEntityDefaultCreate, hpBar, player } from "./game";
import { EntityBoss, EntityBossBullet, EntityBossDieded, EntityBossHarmless, EntityHelper } from "./gameEntityTypes";
import * as SdfSpriteIndices from "./sdfSpriteIndices";
import { drawSdfSprite } from "./renderer";
import { Vec2, Vec3, identityQuaternion, quat, quatFromAxisAngle, quatFromDirection, vec2Rotate, vec2Splay, vec3, vec3Splay, vecClone, vecCopy, vecFMKA, vecMix, vecNormalize, vecNormalizeSafe, vecSet, vecSub, xAxis } from "./juvec";
import { Deg, cos, fract, max, min, pickFromArray, random, randomRangeInt, sign, sin, smoothstep } from "./aliasedFunctions";
import { createGenericProjectile } from "./miscEntities";
import { playSample } from "./audio";
import * as SfxIds from "./sfxIds";
import { SawishSignal, createSawishSignal } from "~sawishSignal";
import { setGameOverlayMode, GameScreenOverlayModeSelectUpgrade } from "~gameScreenOverlay";

export const NahuiOllinRadius = 1;
export const NahuiOllinSpriteScale = 0.45;
export const NahuiOllinDaggerRadius = 0.3;
export const NahuiOllinDaggerScale = 1;
export const NahuiOllinOrbRadius = 0.3;

interface NahuiOllin extends Boss {
};

interface NahuiOllinOrb extends Boss {
    prevPos: Vec3;
    light: number;
};

export const createNahuiOllin = () => {
    const ModeIdle = 0;
    const ModeSequencialShot = 1;
    const ModeCircularShot = 2;
    const ModeDied = 3;

    const HitFxDuration = 0.2;
    const SequentialShotDelay = 0.5;
    const OrbShootingCycleWidth = 0.45;
    const OrbShootingCyclesDelay = 8;
    const OrbsDelayBeforeShootingWhileFollowing = 2;
    const OrbFollowingShootingCycleWidth = 0.45;

    let mode: number;
    let clock: number;
    let subClock: number;

    let hitFxTimer = 0;
    let stage: number;

    //const maxHps = [90, 2, 2];
    const maxHps = [90, 100, 50];
    let curHp = 0;

    const e = gameEntityDefaultCreate(EntityBoss) as NahuiOllin;
    e.shapeType = ShapeTypeCircle;
    e.shapeRadius = NahuiOllinRadius;
    vecSet(e.pos, 0, 6, 0);

    const playerDirection = vec3Splay();
    const lastPlayerPos = vec3Splay();

    let idleMovementPhase = 0;

    const orbs: NahuiOllinOrb[] = [];
    let orbsClock = 0;
    const OrbsModeIdle = 0;
    const OrbsModeGoingToCorners = 1;
    const OrbsModeAtCorners = 2;
    const OrbsModeFollowing = 3;
    const OrbsModeFollowingShooting = 4;
    let orbsMode: number;
    let nextShootingOrb: number;
    let orbShootingTrigger: SawishSignal;

    // Create orbs
    for (let i = 0; i < 4; ++i) {
        const p = gameEntityDefaultCreate(EntityBossHarmless) as NahuiOllinOrb;
        p.shapeType = ShapeTypeCircle;
        p.shapeRadius = NahuiOllinOrbRadius;
        p.prevPos = vec3Splay();
        p.light = 0;
        p.hit = () => { };
        p.render = () => {
            drawSdfSprite(SdfSpriteIndices.NahuiOllinOrb + i, p.pos, 1 + p.light * 0.3, identityQuaternion, 0, p.light);
        };
        addEntity(p);
        orbs.push(p);
    }

    const backupOrbsPos = () => {
        for (let i = 0; i < 4; ++i) {
            const o = orbs[i];
            vecCopy(o.prevPos, o.pos);
        }
    };

    const setStage = (newStage: number) => {
        if (newStage == 3) {
            setMode(ModeDied);
            return;
        }

        backupOrbsPos();

        if (newStage == 0) {
            orbsMode = OrbsModeIdle;
        } else if (newStage == 1) {
            orbsClock = 0;
            orbsMode = OrbsModeGoingToCorners;
            nextShootingOrb = randomRangeInt(0, 4);
            orbShootingTrigger = createSawishSignal(OrbShootingCycleWidth);
        } else if (newStage == 2) {
            orbsClock = 0;
            orbsMode = OrbsModeFollowing;
        }

        stage = newStage;
        curHp += maxHps[stage];
        hpBar.reset(curHp);
    };

    setStage(0);

    const spawnDagger = (pos: Vec3, dir: Vec3) => {
        const spawn = createGenericProjectile(EntityBossBullet, pos, NahuiOllinDaggerRadius, dir, 13, SdfSpriteIndices.NahuiOllinDagger);
        spawn.spriteScale = 1 / NahuiOllinDaggerScale;
        quatFromDirection(dir, spawn.rotation);
        addEntity(spawn);
    }

    const createSequentialShot = (pos: Vec3, follow?: boolean, overridePlayerPos?: Vec3) => {
        const p = gameEntityDefaultCreate(EntityHelper) as NahuiOllinOrb;
        const trigger = createSawishSignal(0.15, 0);
        // borrow xD
        const frozenPos = vecClone(pos);
        let originalPlayerPos: Vec3;
        if (!follow) {
            originalPlayerPos = vecClone(overridePlayerPos ?? player.pos);
        }
        p.update = (dts) => {
            trigger(dts);
            if (trigger.edge) {
                vecSub(originalPlayerPos ?? player.pos, frozenPos, playerDirection);
                vecNormalizeSafe(playerDirection, playerDirection);

                spawnDagger(frozenPos, playerDirection);
                if (trigger.count == 3) {
                    p.alive = false;
                }
            }
        };
        addEntity(p);
    };

    const setMode = (nextMode: number) => {
        clock = 0;
        subClock = 0;

        if (nextMode == ModeIdle) {
            subClock = 0.65 + 0.5 * randomRangeInt(0, 2);
        } else if (nextMode == ModeSequencialShot) {
            createSequentialShot(e.pos, true);
        } else if (nextMode == ModeCircularShot) {
            vecSub(player.pos, e.pos, playerDirection);
            vecNormalizeSafe(playerDirection, playerDirection);
        } else if (nextMode == ModeDied) {
            e.type = EntityBossDieded;
            setGameOverlayMode(GameScreenOverlayModeSelectUpgrade);
        }

        mode = nextMode;
    }

    setMode(ModeIdle);

    e.update = (dts: number) => {
        if (mode == ModeDied) {
            return;
        }

        hitFxTimer = max(0, hitFxTimer - dts);

        if (mode == ModeIdle) {
            clock += dts / 2;
            clock = min(clock, subClock);
            idleMovementPhase += dts;
            e.pos[0] = gameArea[0] * 0.8 * sin(idleMovementPhase * 0.82);
            e.pos[1] = 6 + 2 * cos(idleMovementPhase * 1.357);
            if (clock >= subClock) {
                setMode(pickFromArray([ModeSequencialShot, ModeCircularShot]));
            }
        } else if (mode == ModeSequencialShot) {
            clock += dts;
            if (clock >= SequentialShotDelay) {
                setMode(ModeIdle);
            }
        } else if (mode == ModeCircularShot) {
            clock -= dts;
            if (clock <= 0) {
                if (subClock >= 3) {
                    setMode(ModeIdle);
                } else {
                    // Borrow!
                    const nDaggers = 8;
                    for (let i = 0; i < nDaggers; ++i) {
                        // Borrow!
                        let d = vec2Splay();
                        vec2Rotate(playerDirection as any as Vec2, Deg * (i + subClock * 0.5) * 360 / nDaggers, d);
                        spawnDagger(e.pos, d as any as Vec3);
                    }

                    clock += 0.5;
                    subClock++;
                }
            }
        }


        // Move Orbs
        if (orbsMode == OrbsModeIdle) {
            const orbsOrbitingDistance = 2.2;
            orbsClock += dts;
            for (let i = 0; i < 4; ++i) {
                const o = orbs[i];
                const a = orbsClock + Deg * 360 * i / 4;
                // Borrow!
                const p = vec3(cos(a), sin(a), 0);
                vecFMKA(p, orbsOrbitingDistance, e.pos, o.pos);
            }
        } else if (orbsMode == OrbsModeGoingToCorners) {
            orbsClock += dts / 2;
            if (orbsClock >= 1) {
                orbsClock = 1;
                orbsMode = OrbsModeAtCorners;
            }
            for (let i = 0; i < 4; ++i) {
                const o = orbs[i];
                const signX = (i == 0 || i == 3) ? -1 : 1;
                const signY = sign(i - 2);
                // Borrow!
                const dstPos = vec3(gameArea[0] * 0.9 * signX, gameArea[1] * 0.9 * signY, 0);
                vecMix(o.prevPos, dstPos, smoothstep(0, 1, orbsClock), o.pos);
            }
        } else if (orbsMode == OrbsModeAtCorners) {
            orbShootingTrigger(dts);
            orbs[nextShootingOrb].light = 0;
            const count = orbShootingTrigger.count;
            if (count < 3) {
                orbs[nextShootingOrb].light = orbShootingTrigger.invValue;
            }
            if (orbShootingTrigger.edge) {
                if (count == 3) {
                    createSequentialShot(orbs[nextShootingOrb].pos);
                } else if (count == OrbShootingCyclesDelay) {
                    nextShootingOrb = randomRangeInt(0, 4);
                    orbShootingTrigger.count = 0;
                }
            }
        } else if (orbsMode == OrbsModeFollowing) {
            const orbsOrbitingDistance = 5.5;
            orbsClock += dts;
            for (let i = 0; i < 4; ++i) {
                const o = orbs[i];
                const a = orbsClock + Deg * 360 * i / 4;
                // Borrow!
                const p = vec3(cos(a), sin(a), 0);
                vecFMKA(p, orbsOrbitingDistance, player.pos, o.pos);
                const movementK = smoothstep(0, 1, orbsClock);
                vecMix(o.prevPos, o.pos, movementK, o.pos);
            }
            if (orbsClock >= OrbsDelayBeforeShootingWhileFollowing) {
                orbsMode = OrbsModeFollowingShooting;
                backupOrbsPos();
                vecCopy(lastPlayerPos, player.pos);
                orbsClock = 0;
            }
        } else if (orbsMode == OrbsModeFollowingShooting) {
            orbsClock += dts * 2.5;
            const shoot = orbsClock >= 3;
            for (let i = 0; i < 4; ++i) {
                const o = orbs[i];
                if (shoot) {
                    orbsClock = 0
                    createSequentialShot(o.pos, false, lastPlayerPos);
                    orbsMode = OrbsModeFollowing;
                }
                o.light = fract(orbsClock);
            }

        }
    };

    const finalViewQuat = quat();
    quatFromAxisAngle(xAxis, 45 * Deg, finalViewQuat);

    e.render = () => {
        if (mode == ModeDied) {
            return;
        }
        drawSdfSprite(SdfSpriteIndices.NahuiOllin, e.pos, NahuiOllinRadius / NahuiOllinSpriteScale, finalViewQuat, 0, hitFxTimer / HitFxDuration);
    };

    e.hit = () => {
        if (mode != ModeDied) {
            --curHp;
            if (curHp <= 0) {
                setStage(stage + 1);
            }
            hpBar.updateCurrent(curHp);
            hitFxTimer = HitFxDuration;
            playSample(SfxIds.HIT);
        }
    };

    return e;
}