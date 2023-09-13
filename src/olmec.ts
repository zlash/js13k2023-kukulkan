import { Vec3, identityQuaternion, vec3Splay, vecAdd, vecCopy, vecMix, vecSet, yAxisNeg } from "./juvec";
import { Boss, GameEntity, ShapeTypeCircle, addEntity, gameArea, gameEntityDefaultCreate, hpBar, player } from "./game";
import { EntityBoss, EntityBossBulletSolid, EntityBossDieded } from "./gameEntityTypes";
import { drawSdfSprite } from "./renderer";
import * as SdfSpriteIndices from "./sdfSpriteIndices";
import { Pi, abs, almostUnitIdentity, assert, cos, floor, max, min, mix, pickFromArray, plateau, randomRange, randomRangeInt, remap, saturate, shuffleArray, sign, sin, smoothstep, tweenDoubleOvershoot } from "./aliasedFunctions";
import { playSample } from "./audio";
import * as SfxIds from "./sfxIds";
import { createGenericProjectile } from "./miscEntities";
import { GameScreenOverlayModeSelectUpgrade, setGameOverlayMode } from "~gameScreenOverlay";
import { timeOfDay, Night, Day } from "~gameSession";

export const OlmecRadius = 2;
export const OlmecHeightRatio = 1.4;
export const OlmecSpriteScale = 0.6;
export const OlmecSpawnRadius = 0.7;
export const OlmecSpawnScale = 0.5;


const HitFxDuration = 0.2;

/*
Idle: Sways side to side
Stage 1
    Attack type 1: Opens the head and spawns three little heads in a line
    Attack type 2: Moves itself back and forth the screen
Stage 2
Also:
    Attack type 3: Splits itself in three and moves its parts back and forth the screen
Stage 3
    Splits itself and turns around the stage. After a while it forms itself back in the last position of the player.
*/

export interface OlmecPart extends GameEntity {
    offset: Vec3;
    hit: () => void;
};

const ModeIdle = 0;
const ModeShootSpawns = 1;
const ModeGoingDown = 2;
const ModeTripleSplit = 3;
const ModeCircling = 4;
const ModeDied = 5;
const TransitionToMode = 6;

export interface Olmec extends Boss {
};

export const createOlmec = () => {
    const e = gameEntityDefaultCreate(EntityBoss) as Olmec;
    let hitFxTimer = 0;
    let mode: number;
    let subMode: number;
    const olmecParts: Array<OlmecPart> = [];
    let clock: number;
    let subClock: number;
    let numIdleClockCycles: number;
    let dirX: number;

    let transitionToModeTarget = vec3Splay();
    let transitionToModeSrc = vec3Splay();
    let transitionToModeNextMode: number;

    const TripleSplitModeSplitJoin = 0;
    const TripleSplitModeMove = 1;

    let tripleSplitSplitJointDirection: number;
    let tripleSplitPartRandomization: number[];

    const CirclingModeStart = 0;
    const CirclingModeAttack = 1;

    let circlingNext: number;
    let circlingFirstTurn: boolean;

    const totalSpawnBullets = [3, 4, 5][timeOfDay];
    let spawnedBulletsCount: number;

    const goingDownClockDivisor = [4, 3, 2.5][timeOfDay];
    const tripleSplitMoveClockDivisor = [10, 6, 4.5][timeOfDay];
    const circlingAttackClockDivisor = [8, 5, 4][timeOfDay];
    const shootSpawnsRateClockDivisor = [2, 1.5, 1.5][timeOfDay];

    const maxHps = [100, 150, 150];

    let stage = 0;
    let curHp = maxHps[0];
    hpBar.reset(curHp);

    let modesToPick = [[ModeShootSpawns, ModeGoingDown], [ModeShootSpawns, ModeTripleSplit], [ModeCircling]];

    const olmecBaseY = 6;
    vecSet(e.pos, 0, olmecBaseY, 0);

    const setMode = (nextMode: number) => {
        clock = 0;
        subClock = 0;

        const modeRequiresTransition = mode != TransitionToMode && (nextMode == ModeTripleSplit || nextMode == ModeCircling);
        if (modeRequiresTransition) {
            transitionToModeNextMode = nextMode;
            nextMode = TransitionToMode;
            vecSet(transitionToModeTarget, 0, olmecBaseY, 0);
            vecCopy(transitionToModeSrc, e.pos);
        }

        if (nextMode == ModeIdle) {
            numIdleClockCycles = 0.5 + randomRangeInt(0, 2);
            dirX = sign(randomRange(-0.5, 0.5));
        }
        else if (nextMode == ModeShootSpawns) {
            spawnedBulletsCount = 0;
        }
        else if (nextMode == ModeTripleSplit) {
            subMode = TripleSplitModeSplitJoin;
            tripleSplitSplitJointDirection = 1;
            tripleSplitPartRandomization = shuffleArray([0, 1, 2]);
        } else if (nextMode == ModeCircling) {
            circlingNext = 0;
            subMode = CirclingModeStart;
            circlingFirstTurn = true;
            vecCopy(transitionToModeTarget, e.pos);
        } else if (nextMode == ModeDied) {
            e.type = EntityBossDieded;
            setGameOverlayMode(GameScreenOverlayModeSelectUpgrade);
        }

        mode = nextMode;
    }

    setMode(ModeIdle);

    // Create parts
    for (let i = 0; i < 3; ++i) {
        const p = gameEntityDefaultCreate(EntityBoss) as OlmecPart;
        p.shapeType = ShapeTypeCircle;
        p.shapeRadius = OlmecRadius;
        p.offset = vec3Splay();
        p.hit = () => e.hit();
        p.render = () => {
            drawSdfSprite(SdfSpriteIndices.OlmecA + i, p.pos, OlmecRadius / OlmecSpriteScale, identityQuaternion, 0, hitFxTimer / HitFxDuration);
        };
        addEntity(p);
        olmecParts.push(p);
    }

    e.update = (dts: number) => {
        hitFxTimer = max(0, hitFxTimer - dts);

        if (mode == ModeIdle) {
            clock += dts / 2;
            clock = min(clock, numIdleClockCycles);
            e.pos[2] = 0.5 * sin(clock * 2 * Pi);
            e.pos[0] += dirX * 4 * dts;
            if (abs(e.pos[0]) + OlmecRadius > gameArea[0]) {
                e.pos[0] = (gameArea[0] - OlmecRadius) * dirX * 0.99;
                dirX *= -1;
            }
            if (clock >= numIdleClockCycles) {
                setMode(pickFromArray(modesToPick[stage]));
            }
        }
        else if (mode == ModeShootSpawns) {
            clock += dts / shootSpawnsRateClockDivisor;
            const rampFraction = 0.1;
            // Envelope for mouth opening
            const envelope = plateau(clock, 0.1, 0.1);

            const openDist = 1.5;
            olmecParts[0].offset[2] = -envelope * openDist;
            olmecParts[1].offset[2] = envelope * openDist;
            olmecParts[2].offset[2] = envelope * openDist;

            // Spawn bullets 
            const bulletIdx = min(totalSpawnBullets - 1, remap(clock, rampFraction, 1 - rampFraction, 0, totalSpawnBullets));
            if (floor(bulletIdx) == spawnedBulletsCount) {
                const spawnSpeed = [13, 22, 20][timeOfDay];
                const spawn = createGenericProjectile(EntityBossBulletSolid, e.pos, OlmecSpawnRadius, yAxisNeg, spawnSpeed, SdfSpriteIndices.OlmecSpawn);
                spawn.spriteScale = OlmecSpawnRadius / OlmecSpawnScale;
                addEntity(spawn);
                ++spawnedBulletsCount;
            }

            if (clock >= 1.0) {
                setMode(ModeIdle);
            }
        }
        else if (mode == ModeGoingDown) {
            clock = saturate(clock + dts / goingDownClockDivisor);
            const rampFraction = 0.4;
            const envelope = plateau(clock, rampFraction, rampFraction);
            e.pos[1] = mix(olmecBaseY, -olmecBaseY - 1, tweenDoubleOvershoot(envelope));
            if (clock >= 1.0) {
                setMode(ModeIdle);
            }
        }
        else if (mode == TransitionToMode) {
            clock = saturate(clock + dts);
            vecMix(transitionToModeSrc, transitionToModeTarget, smoothstep(0, 1, clock), e.pos);
            if (clock >= 1.0) {
                setMode(transitionToModeNextMode);
            }
        }
        else if (mode == ModeTripleSplit) {
            if (subMode == TripleSplitModeSplitJoin) {
                assert(dts != 0);
                subClock = saturate(subClock + tripleSplitSplitJointDirection * dts * 1.3);

                if (subClock >= 1.0) {
                    subMode = TripleSplitModeMove;
                }

                if (subClock <= 0.0) {
                    setMode(ModeIdle);
                }
            } else { // Triple Split Mode Move
                clock = saturate(clock + dts / tripleSplitMoveClockDivisor);
                if (clock >= 1.0) {
                    subMode = TripleSplitModeSplitJoin;
                    tripleSplitSplitJointDirection = -1;
                }
            }
        } else if (mode == ModeCircling) {
            clock = clock + dts / (subMode == CirclingModeAttack ? 4 : 3);

            if (clock >= 1) {
                circlingNext = (circlingNext + 1) % 3;
                clock -= 1;
                subMode = CirclingModeAttack;
            }

            if (subMode == CirclingModeAttack) {
                if (clock < 0.5) {
                    vecCopy(transitionToModeTarget, player.pos);
                }
                subClock = subClock + dts / circlingAttackClockDivisor;
                if (subClock >= 1) {
                    subClock -= 1;
                    circlingFirstTurn = false;
                }
            }
        } else if (mode == ModeDied) {
            clock += dts / 2;
        }

        for (let i = 0; i < 3; ++i) {
            let p = olmecParts[i];

            if (mode == ModeDied) {
                p.pos[1] += dts * 20;
                p.pos[2] -= clock;
                continue;
            }
            vecAdd(e.pos, p.offset, p.pos);

            const fullyFormedZ = 0.99 * (i - 1) * 2 * OlmecHeightRatio * OlmecRadius / 3;

            if (mode == ModeTripleSplit) {
                p.pos[0] = mix(0, (i - 1) * (gameArea[0] - OlmecRadius), smoothstep(0, 0.5, subClock));
                p.pos[2] = mix(fullyFormedZ, 0, smoothstep(0.5, 1.0, subClock));
                if (subMode == TripleSplitModeMove) {
                    const id = tripleSplitPartRandomization[i];
                    const rampFraction = 0.3;
                    const overlapDuration = 0.1;
                    const envelope = plateau(smoothstep(id * overlapDuration, overlapDuration * (id - 2) + 1, clock), rampFraction, rampFraction);
                    p.pos[1] = mix(olmecBaseY, -olmecBaseY - OlmecRadius, tweenDoubleOvershoot(envelope));
                }
            } else if (mode == ModeCircling) {
                const r = gameArea[0] + OlmecRadius;

                if (subMode == CirclingModeStart) {
                    const alpha = Pi * ((i / 3) * 2 * smoothstep(0, 1, clock) + 0.5);
                    const nextR = mix(e.pos[1], r, clock);

                    p.pos[0] = cos(alpha) * nextR;
                    p.pos[1] = sin(alpha) * nextR;
                    p.pos[2] = mix(fullyFormedZ, 0, clock);
                } else {
                    const smoothSubClock = circlingFirstTurn ? almostUnitIdentity(subClock) : subClock;
                    const alpha = Pi * ((smoothSubClock + i / 3) * 2 + 0.5);

                    p.pos[0] = cos(alpha) * r;
                    p.pos[1] = sin(alpha) * r;

                    const thisOneShouldCircle = timeOfDay == Night || (timeOfDay == Day ? circlingNext == i : circlingNext != i);

                    if (clock >= 0.5 && thisOneShouldCircle) {
                        const k = (clock - 0.5) / 0.5;
                        vecMix(p.pos, transitionToModeTarget, smoothstep(0, 1, 1 - abs(k * 2 - 1)), p.pos);
                    }
                }
            }
            else {
                p.pos[2] += fullyFormedZ;
            }
        }

    };

    e.render = () => {
    };

    e.hit = () => {
        if (mode != ModeDied) {
            --curHp;
            if (curHp <= 0) {
                ++stage;
                if (stage == 3) {
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
    return e;
};