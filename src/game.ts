import { Deg, arrayLast, cos, sin } from "./aliasedFunctions";
import { Vec2, Vec3, mat4LookAt, quat, quatFromAxisAngle, quatMul, identityQuaternion, vec2, vec2Splay, vec3, vec3Splay, vecSub, yAxis, zAxis, zeroVector } from "./juvec";
import { viewMatrix, drawSdfSprite, drawOrtho2d, setRenderFloorOn } from "./renderer";
import * as SdfSpriteIndices from "./sdfSpriteIndices";
import { isInputDown } from "./input";
import * as Input from "./input";
import * as GameEntityTypes from "./gameEntityTypes";
import { Player, createPlayer } from "./player";
import { Olmec, createOlmec } from "~olmec";
import { renderText } from "~font";
import { GameScreenOverlayModeGameOver, GameScreenOverlayModeOff, gameScreenOverlayRender, gameScreenOverlayUpdate, setGameOverlayMode } from "~gameScreenOverlay";
import { HpBar, createHpBar } from "~hpBar";
import { createNahuiOllin } from "~nahuiOllin";
import { createCalli } from "~calli";
import { bossesPath, sessionStage } from "~gameSession";


export const gameArea = vec2(6.7, 9.5);

type GameEntityType = number;
export let entities: GameEntity[];

export const ShapeTypeNone = 0;
export const ShapeTypeCircle = 1;

export let player: Player;
export let hpBar: HpBar;

export interface GameEntity {
    type: GameEntityType;
    alive: boolean;
    pos: Vec3;
    shapeType: number;
    shapeRadius: number;
    update: (dts: number) => void;
    render?: () => void;
}

export interface Boss extends GameEntity {
    hit: () => void;
}

export const gameEntityDefaultCreate = (type: GameEntityType) => {
    return {
        type,
        pos: vec3Splay(),
        shapeType: ShapeTypeNone,
        update: (dts: number) => { },
    } as GameEntity;
};

export const addEntity = (entity: GameEntity) => {
    entity.alive = true;
    entities.push(entity);
};

export const gameInit = () => {
    setGameOverlayMode(GameScreenOverlayModeOff);
    entities = [];
    player = createPlayer();
    addEntity(player);
    hpBar = createHpBar();
    addEntity(hpBar);

    addEntity([createOlmec, createNahuiOllin, createCalli][bossesPath[sessionStage]]());
};

export const gameMainLoop = (dts: number) => {

    // Updates 

    gameScreenOverlayUpdate(dts);

    for (let e of entities) {
        if (e.alive) {
            e.update(dts);
        }
    }

    // Collisions

    const collides = (a: GameEntity, b: GameEntity) => {
        let collision = false;
        if (a.shapeType == ShapeTypeCircle && a.shapeType == b.shapeType) {
            const rSum = a.shapeRadius + b.shapeRadius;
            let dx = b.pos[0] - a.pos[0];
            let dy = b.pos[1] - a.pos[1];
            collision = dx * dx + dy * dy <= rSum * rSum;
        }
        return a.alive && b.alive && collision;
    };

    const isAny = (a: GameEntity, b: GameEntity, type: GameEntityType) => {
        if (a.type == type) return [a, b];
        if (b.type == type) return [b, a];
        return [];
    }

    for (let i = 0; i < entities.length; ++i) {
        const entityA = entities[i];
        for (let j = i + 1; j < entities.length; ++j) {
            const entityB = entities[j];
            if (collides(entityA, entityB)) {
                {
                    let [eA, eB] = isAny(entityA, entityB, GameEntityTypes.EntityBullet);
                    if (eA) {
                        if (eB.type == GameEntityTypes.EntityBoss || eB.type == GameEntityTypes.EntityBossHarmless || eB.type == GameEntityTypes.EntityBossBulletSolid) {
                            eA.alive = false;
                            if (eB.type == GameEntityTypes.EntityBoss) {
                                (eB as Boss).hit?.();
                            }

                        }
                        continue;
                    }

                    [eA, eB] = isAny(entityA, entityB, GameEntityTypes.EntityPlayer);
                    if (eA) {
                        if (eB.type == GameEntityTypes.EntityBoss || eB.type == GameEntityTypes.EntityBossBullet || eB.type == GameEntityTypes.EntityBossBulletSolid) {
                            (eA as Player).hit();
                        }
                        continue;
                    }
                }
            }
        }
    }

    // Removing dead

    for (let i = entities.length - 1; i >= 0; --i) {
        if (!entities[i].alive) {
            entities[i] = arrayLast(entities);
            entities.pop();
        }
    }

    // Render
    setRenderFloorOn();

    for (let e of entities) {
        e.render && e.render();
    }

    gameScreenOverlayRender();

    // Debug game area markers
    // Todo: borrow
    /*     let tmpVec = vec3(-gameArea[0], gameArea[1], 0);
        drawSdfSprite(SdfSpriteIndices.Guiermo, tmpVec, 1, identityQuaternion);
        tmpVec = vec3(gameArea[0], gameArea[1], 0);
        drawSdfSprite(SdfSpriteIndices.Guiermo, tmpVec, 1, identityQuaternion);
        tmpVec = vec3(gameArea[0], -gameArea[1], 0);
        drawSdfSprite(SdfSpriteIndices.Guiermo, tmpVec, 1, identityQuaternion);
        tmpVec = vec3(-gameArea[0], -gameArea[1], 0);
        drawSdfSprite(SdfSpriteIndices.Guiermo, tmpVec, 1, identityQuaternion); */

};