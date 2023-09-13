import { isInputDown, wasInputPressed } from "./input";
import * as Input from "./input";
import { EntityBullet, EntityPlayer } from "./gameEntityTypes";
import { Quaternion, Vec3, mat4LookAt, quat, quatFromAxisAngle, quatFromDirection, identityQuaternion, vec2, vec2AngleBetween, vec2Rotate, vec2Splay, vec3, vec3Splay, vecAdd, vecClone, vecCopy, vecDot, vecMulK, vecNormalize, vecSet, vecSub, vecSymmetricClamp, yAxis, yAxisNeg, zAxis, zeroVector, vec4Splay, vec4, vecEq } from "./juvec";
import { GameEntity, ShapeTypeCircle, addEntity, gameArea, gameEntityDefaultCreate } from "./game";
import { Deg, Pi, clamp, cos, fract, max, mix, pow, randomRange, saturate, sign, sin, smoothstep, symmetricClamp, tweenOut, tweenParabola, tweenQuad } from "./aliasedFunctions";
import { drawOrtho2d, drawSdfSprite, viewMatrix } from "./renderer";
import * as SdfSpriteIndices from "./sdfSpriteIndices";
import * as SfxIds from "./sfxIds";
import { playSample } from "./audio";
import { createGenericProjectile } from "./miscEntities";
import { GameScreenOverlayModeGameOver, GameScreenOverlayModeOff, gameOverlayMode, setGameOverlayMode } from "./gameScreenOverlay";
import { loseLive, playerLives } from "~gameSession";
import { renderText } from "~font";

const headSpeed = 10;
const numSegments = 28;

export const headRDepth = 0.5;
export const headRWidth = 2.5 * headRDepth / 3;
export const segmentRDepth = 0.4;

export const BulletRadius = 0.15;

export interface Player extends GameEntity {
    hit: () => void,
    immortal: boolean;
    dummy: boolean;
};

export let floorPos = 0;

export const createPlayer = () => {
    const player = gameEntityDefaultCreate(EntityPlayer) as Player;
    player.immortal = false;
    player.dummy = false;
    player.shapeType = ShapeTypeCircle;
    player.shapeRadius = headRWidth * 0.7;
    const headQuat = quat();
    const segmentsPos = [] as Array<Vec3>;
    const segmentsPrevPos = [] as Array<Vec3>;
    const segmentQuats = [] as Array<Quaternion>;
    let clock = 0;

    let goBackToSlitherClock = 0;
    let respawning = false;

    for (let i = 0; i < numSegments; ++i) {
        segmentsPos.push(vec3Splay());
        segmentsPrevPos.push(vec3Splay());
        segmentQuats.push(vecClone(identityQuaternion));
    }

    const setPosWithSegments = (...pos: number[]) => {
        vecSet(player.pos, ...pos);
        for (let i = 0; i < numSegments; ++i) {
            let p = segmentsPos[i];
            vecMulK(yAxis, -i - 1, p);
            vecAdd(p, player.pos, p);
        }
    }

    const respawnDuration = 2.5;
    const respawnEnterDuration = 1;
    const yPositionAtRespawn = -gameArea[1] * 2;

    const yPositionAtStart = -7;
    const prevPos = vec3Splay();
    setPosWithSegments(0, yPositionAtStart);

    player.update = (dts: number) => {
        clock += dts;

        // Input
        let isInputEnabled = true && (gameOverlayMode == GameScreenOverlayModeOff) && playerLives > 0 && !player.dummy;

        if (respawning) {
            if (clock >= respawnDuration) {
                clock = respawnDuration;
                respawning = false;
            }
            if (clock < respawnEnterDuration) {
                isInputEnabled = false;
                player.pos[1] = mix(yPositionAtRespawn, yPositionAtStart, tweenParabola(-2, clock / respawnEnterDuration));
            }
        }

        goBackToSlitherClock += dts;

        let floorSpeed = 1;

        if (isInputEnabled) {
            vecCopy(prevPos, player.pos);
            if (isInputDown(Input.InputUp)) {
                player.pos[1] += headSpeed * dts;
                floorSpeed = 1.9;
            }

            if (isInputDown(Input.InputDown)) {
                player.pos[1] -= headSpeed * dts;
                floorSpeed = 0.6;
            }

            if (isInputDown(Input.InputLeft)) {
                player.pos[0] -= headSpeed * dts;
            }

            if (isInputDown(Input.InputRight)) {
                player.pos[0] += headSpeed * dts;
            }

            if (!vecEq(prevPos, player.pos)) {
                goBackToSlitherClock = 0;
                for (let i = 0; i < numSegments; ++i) {
                    vecCopy(segmentsPrevPos[i], segmentsPos[i]);
                }
            }

            player.pos[0] = symmetricClamp(player.pos[0], gameArea[0] - headRWidth);
            player.pos[1] = symmetricClamp(player.pos[1], gameArea[1] - headRDepth);

            if (wasInputPressed(Input.InputA)) {
                addEntity(createGenericProjectile(EntityBullet, player.pos, BulletRadius, yAxis, 30, SdfSpriteIndices.Bullet));
                playSample(SfxIds.PEW, randomRange(0.9, 1.1));
            }
        }

        floorPos += floorSpeed * dts * 35;


        // Update segments

        // todo: Borrow
        let tmpV2a = vec2Splay(0);
        let prevVecDirection = vec2(0, -1);

        if (goBackToSlitherClock > 0) {
            for (let i = 1; i < numSegments; ++i) {
                let p = segmentsPos[i];
                p[0] += dts * sign(player.pos[0] - p[0]);
                p[1] -= dts;
            }
        }

        for (let i = 0; i < numSegments; ++i) {

            const prevSegment = i == 0 ? player.pos : segmentsPos[i - 1];
            vecSub(segmentsPos[i], prevSegment, tmpV2a as any as Vec3);

            (tmpV2a as any)[2] = 0;
            vecNormalize(tmpV2a, tmpV2a);

            let angle = vec2AngleBetween(prevVecDirection, tmpV2a);

            const angleLimit = Deg * mix(5, 50, 1 - pow(1 - (i / (numSegments - 1)), 5));

            angle = clamp(angle, -angleLimit, angleLimit);

            vec2Rotate(prevVecDirection, -angle, tmpV2a);

            quatFromDirection(tmpV2a as any as Vec3, segmentQuats[i]);
            vecCopy(prevVecDirection, tmpV2a);

            vecMulK(tmpV2a, segmentRDepth * 1.3, tmpV2a);
            vecAdd(prevSegment, tmpV2a as any as Vec3, segmentsPos[i]);
            segmentsPos[i][2] = -i / 8;
            // quatFromAxisAngle(zAxis, Deg * 90, segmentQuats[i]);
        }

        //quatFromAxisAngle(yAxis, 45 * Deg, vecTmpA);
        quatFromAxisAngle(zAxis, Deg * 90, headQuat);


        // TODO: Borrow

        const camH = 0.5 + 0.5 * max(-gameArea[1], player.pos[1]) / gameArea[1];
        const eyeAngle = Deg * mix(40, 85, tweenOut(tweenQuad, camH));
        const distance = 23;

        const camEye = vec3(0, -cos(eyeAngle) * distance, sin(eyeAngle) * distance);

        if (!player.dummy) {
            mat4LookAt(camEye, vec3(0, -(1 - camH) * 3, 0), zAxis, viewMatrix);
        }

        /*         const camH = 0.5 + 0.5 * player.pos[1] / gameArea[1];
                const invCamH = 1 - camH;
                const camEye = vec3(-player.pos[0] * 0.32, -3 - invCamH * 18, mix(10, 20, tweenOut(tweenQuad, camH)));
                const camTarget = vec3(0, invCamH * 5 - invCamH, 0);
                mat4LookAt(camEye, camTarget, yAxis, viewMatrix); */

        // Debug aerial view
        //mat4LookAt(vec3(0, 0, 15), zeroVector as Vec3, yAxis, viewMatrix);
    };

    player.render = () => {
        if (respawning && fract(clock * 7) > 0.6) {
            return;
        }

        drawSdfSprite(SdfSpriteIndices.KukulHead, player.pos, 1, headQuat);

        for (let i = 0; i < numSegments; ++i) {
            drawSdfSprite(SdfSpriteIndices.KukulBodySegment, segmentsPos[i], 1, segmentQuats[i]);
        }

        if (!player.dummy) {
            const tp = vec2(150, 50);
            renderText(`${playerLives} LIVES LEFT`, tp, 21, true, vec4(0, 0, 0, 0.7));
            renderText(`${playerLives} LIVES LEFT`, tp, 20, true);
        }
    };

    player.hit = () => {
        if (!respawning && playerLives > 0 && !player.immortal) {
            loseLive();
            clock = 0;
            setPosWithSegments(0, yPositionAtRespawn);
            if (playerLives > 0) {
                respawning = true;
            } else {
                setGameOverlayMode(GameScreenOverlayModeGameOver);
            }
        }
    };

    return player;
};

