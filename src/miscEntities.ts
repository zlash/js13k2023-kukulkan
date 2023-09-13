import { Vec2, Vec3, quat, quatFromDirection, identityQuaternion, vec2, vec2Splay, vec3Splay, vecAdd, vecClone, vecCopy, vecMulK, Quaternion, vecDot } from "./juvec";
import { GameEntity, ShapeTypeCircle, gameEntityDefaultCreate } from "./game";
import { EntityBullet } from "./gameEntityTypes";
import { drawSdfSprite } from "./renderer";
import * as SdfSpriteIndices from "./sdfSpriteIndices";


export interface GenericProjectile extends GameEntity {
    dir: Vec3;
    spriteScale: number;
    rotation: Quaternion;
    customUpdate?: (b: GenericProjectile, dts: number) => void;
};


export const createGenericProjectile = (entityType: number, pos: Vec3, r: number, dir: Vec3, speed: number, sprite: number) => {
    const b = gameEntityDefaultCreate(entityType) as GenericProjectile;
    vecCopy(b.pos, pos);
    b.dir = vecClone(dir);
    b.shapeType = ShapeTypeCircle;
    b.shapeRadius = r;
    b.spriteScale = 1;
    b.rotation = vecClone(identityQuaternion);

    // Borrower!
    const tmpVec = vec3Splay();

    b.update = (dts: number) => {
        if (b.customUpdate) b.customUpdate(b, dts);
        vecMulK(b.dir, dts * speed, tmpVec);
        vecAdd(b.pos, tmpVec, b.pos);
        if (vecDot(b.pos, b.pos) > 50 * 50) {
            b.alive = false;
        };
    };

    let tmpQ = quat();

    b.render = () => {
        drawSdfSprite(sprite, b.pos, b.spriteScale, b.rotation);
    };

    return b;
};

