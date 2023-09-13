import { sdfBakeToTexture } from "./sdfMapper";
import { createBox, createCylinder, createSdf, createSphere } from "./sdfBuilder";
import * as SdfBuilderOps from "./sdfBuilderOps";
import * as SdfSpriteIndices from "./sdfSpriteIndices";
import * as MaterialIds from "./materialIds";
import { BulletRadius, headRDepth, headRWidth, segmentRDepth } from "./player";
import { sqrt } from "~aliasedFunctions";
import { OlmecHeightRatio, OlmecRadius, OlmecSpriteScale, OlmecSpawnRadius, OlmecSpawnScale } from "./olmec";
import { NahuiOllinDaggerScale, NahuiOllinOrbRadius, NahuiOllinSpriteScale } from "~nahuiOllin";
import { CalliBottomSpriteScale, CalliDominoSlabHRadiusRatio, CalliDominoSlabSpriteScale, CalliModelBottomOffset, CalliModelBottomThick, CalliModelSide, CalliModelTThickRad, CalliModelTopOffset, CalliModelXOffset, CalliTRadius, CalliTSpriteScale, CalliTopSpriteScale } from "~calli";


const roundedSlab = (r: number, w: number, h: number, d: number) => {
    return createSdf(SdfBuilderOps.Cylinder, r, h).elongate(w - r, d - r);
};

export const buildKukulHead = () => {
    const jawBaseRX = headRDepth;
    const jawBaseRY = headRWidth;
    const jawBaseRZ = headRWidth;

    const zMouthOffset = -0.1;

    const smoothK = 0.05;
    const mouthRX = jawBaseRX * 0.6 - smoothK;
    const mouthRZ = jawBaseRZ * 0.5 - smoothK;

    const jawBase = roundedSlab(0.1, jawBaseRX, jawBaseRZ, jawBaseRY).union(
        createSphere(0.3).translate(0, 0, 0.22).union(
            createSphere(0.25).translate(-0.13, 0.13, 0.23).symmetry(0, 1)
        ).setMaterial(MaterialIds.ColorYellow)
    ).subtract(
        createBox(mouthRX, jawBaseRY + 1, mouthRZ).smooth(smoothK).translate(jawBaseRX - mouthRX, 0, zMouthOffset)
    ).setMaterial(MaterialIds.ColorJade);



    const cShapedThingThk = 0.53;
    const cShapedThing = roundedSlab(0.1, 1, 1, 1).subtract(
        roundedSlab(0.1, 1, 1 - cShapedThingThk, 1).translate(cShapedThingThk)
    );

    const yellowMouthThingie = createCylinder(0.17, 0.1).rotateYZ(90).translate(-0.2, 0.36, -0.11).setMaterial(MaterialIds.ColorYellow);

    const eye = createSphere(0.07).translate(-0.15, 0.4, 0.2).setMaterial(MaterialIds.ColorRed);
    const sideStuff = createSphere(0.06).elongate(0, 0, 0.08).translate(0.33, 0.18, 0.07).setMaterial(MaterialIds.ColorWhite).union(yellowMouthThingie);


    const sideHoles = createSphere(0.08).translate(0.5, 0.2, 0.25).union(createSphere(0.1).translate(-0.15, 0.4, 0.2));

    const gums = cShapedThing.scale(0.31).translate(0.13, 0, -0.1).setMaterial(MaterialIds.ColorRed);
    const teethBase = cShapedThing.scale(0.23).translate(0.13, 0, -0.1).setMaterial(MaterialIds.ColorWhite);
    return jawBase.union(gums, teethBase, sideStuff.symmetry(0, 1)).subtract(sideHoles.symmetry(0, 1)).union(eye.symmetry(0, 1));
};

const bakeKukul = async () => {
    //lade 57 147 73
    //  return createSdf(SdfBuilderOps.Cylinder, 0.08, jawHeight).elongate(headRDepth, headRWidth);
    await sdfBakeToTexture(buildKukulHead(), SdfSpriteIndices.KukulHead);

    const slot = createSdf(SdfBuilderOps.Cylinder, 0.2, 1).translate(-segmentRDepth);
    await sdfBakeToTexture(roundedSlab(0.08, segmentRDepth, headRWidth * 0.8, headRWidth * 0.8).subtract(slot).setMaterial(MaterialIds.ColorJade), SdfSpriteIndices.KukulBodySegment);
}

const bakeOlmec = async () => {
    const sphereHeight = 0.8;
    const halfFaceHeight = OlmecHeightRatio - sphereHeight / 2;

    let helmet = createSdf(SdfBuilderOps.Cylinder, 1, halfFaceHeight);
    helmet = helmet.union(createSdf(SdfBuilderOps.Sphere, sphereHeight).translate(0, 0, halfFaceHeight));

    const helmetWidth = 0.18;
    const faceRad = 1 - helmetWidth;
    const faceBase = createSdf(SdfBuilderOps.Cylinder, faceRad, halfFaceHeight);

    const helmetHole = faceBase.translate(0, -2 * helmetWidth);
    helmet = helmet.smoothSubtract(helmetHole, 0.3);

    const helmetBand = 0.2;
    helmet = helmet.union(createSdf(SdfBuilderOps.Cylinder, 1.08, helmetBand).translate(0, 0, halfFaceHeight));

    let face = faceBase.scale(0.9).smooth(0.1);

    const noseSize = 0.4;
    face = face.smoothUnion(createSdf(SdfBuilderOps.Sphere, noseSize).translate(0, -faceRad, 0), 0.1);

    let head = helmet;
    head = head.union(face);
    head = head.subtract(face.scale(0.78));

    head = head.translate(0, 0, -0.5).setMaterial(MaterialIds.ColorClay);

    for (let i = 0; i < 3; ++i) {
        //const part = helmet.translate(0, 0, h * (i - 1) / 4).intersect(createSdf(SdfBuilderOps.Box, 1, 1, h / 6));

        const part = head.translate(0, 0, (1 - i) * OlmecHeightRatio * 2 / 3).intersect(createSdf(SdfBuilderOps.Box, 2, 2, OlmecHeightRatio / 3 - 0.1).smooth(0.1));
        await sdfBakeToTexture(part.scale(OlmecSpriteScale), SdfSpriteIndices.OlmecA + i);
    }

    await sdfBakeToTexture(head.scale(OlmecSpawnScale), SdfSpriteIndices.OlmecSpawn);
};

export const buildNahuiOllinBody = () => {
    const depth = 0.35;
    const body = createCylinder(0.7, depth).setMaterial(MaterialIds.ColorYellow).union(
        createCylinder(0.5, depth + 0.05).setMaterial(MaterialIds.ColorWhite),
        createCylinder(0.1, depth + 0.1).setMaterial(MaterialIds.ColorBlack)
    );
    const cosoDiagonal = createBox(1.5, 0.2, depth).setMaterial(MaterialIds.ColorRed);
    const sides = createCylinder(0.5, depth).setMaterial(MaterialIds.ColorBlue).union(createCylinder(0.25, depth + 0.05)).setMaterial(MaterialIds.ColorRed).translate(1).symmetry(1);
    const ollin = body.union(sides, cosoDiagonal.rotateXY(45).symmetry(1, 1));

    return ollin;
};

const bakeNahuiOllin = async () => {

    const daggerRad = 1;
    const dagger = createSdf(SdfBuilderOps.PMan, 8, daggerRad, 0.18).rotateXY(-90).translate(-daggerRad / 2, 0, 0).setMaterial(MaterialIds.ColorClay);

    const ollin = buildNahuiOllinBody();
    await sdfBakeToTexture(ollin.union(dagger.rotateXY(-90).translate(0, 0.8).symmetry(0, 1)).scale(NahuiOllinSpriteScale), SdfSpriteIndices.NahuiOllin);


    await sdfBakeToTexture(dagger.scale(NahuiOllinDaggerScale), SdfSpriteIndices.NahuiOllinDagger);

    await sdfBakeToTexture(createSphere(NahuiOllinOrbRadius).setMaterial(MaterialIds.ColorBlue), SdfSpriteIndices.NahuiOllinOrb);
    await sdfBakeToTexture(createSphere(NahuiOllinOrbRadius).setMaterial(MaterialIds.ColorRed), SdfSpriteIndices.NahuiOllinOrb1);
    await sdfBakeToTexture(createSphere(NahuiOllinOrbRadius).setMaterial(MaterialIds.ColorJade), SdfSpriteIndices.NahuiOllinOrb2);
    await sdfBakeToTexture(createSphere(NahuiOllinOrbRadius).setMaterial(MaterialIds.ColorYellow), SdfSpriteIndices.NahuiOllinOrb3);
};

export const buildCalliSlab = () => {
    const base = roundedSlab(0.26, 1, 0.2, CalliDominoSlabHRadiusRatio).setMaterial(MaterialIds.ColorClay);
    const k = 0.2;
    const danger = roundedSlab(0.26, 1 - k, 0.2, CalliDominoSlabHRadiusRatio - k).onion(0.13).onion(0.05).translate(0, 0, -0.26).setMaterial(MaterialIds.ColorRed).subtract(
        createBox(1, 1, 0.2).smooth(0.06).translate(0, 0, -0.6)
    );
    return base.union(danger).scale(CalliDominoSlabSpriteScale);
};

const bakeCalli = async () => {
    const height = 0.5;
    const smoothK = 0.15;

    const buildT = (h: number) => {
        const tPart = createSdf(SdfBuilderOps.Box, CalliModelTThickRad - smoothK, 1 - smoothK, h).smooth(smoothK);
        return tPart.union(tPart.rotateXY(90).translate(0, 1 - CalliModelTThickRad)).setMaterial(MaterialIds.ColorJade);
    }

    const calliT = buildT(height);
    await sdfBakeToTexture(calliT.scale(CalliTSpriteScale), SdfSpriteIndices.CalliT);

    let calliTop = createSdf(SdfBuilderOps.Box, CalliModelSide / 2 - smoothK, CalliModelBottomThick / 2 - smoothK, height).smooth(smoothK).translate(...CalliModelTopOffset);

    calliTop = calliTop.smoothSubtract(buildT(height + 1), 0.05).setMaterial(MaterialIds.ColorClay);

    const rightWidth = (CalliModelSide / 2 + CalliModelXOffset - CalliModelTThickRad) / 2;
    const calliRight = createSdf(SdfBuilderOps.Box, rightWidth - smoothK, CalliModelSide / 2 - CalliModelBottomThick - smoothK, height).smooth(smoothK).setMaterial(MaterialIds.ColorClay);
    calliTop = calliTop.union(calliRight.translate(rightWidth + CalliModelTThickRad, -CalliModelTThickRad));

    await sdfBakeToTexture(calliTop.translate(-CalliModelTopOffset[0], -CalliModelTopOffset[1]).scale(CalliTopSpriteScale), SdfSpriteIndices.CalliTop);

    const calliBottom = createSdf(SdfBuilderOps.Box, CalliModelSide / 2 - smoothK, CalliModelBottomThick / 2 - smoothK, height).smooth(smoothK).setMaterial(MaterialIds.ColorClay);

    await sdfBakeToTexture(calliBottom.scale(CalliBottomSpriteScale), SdfSpriteIndices.CalliBottom);


    await sdfBakeToTexture(buildCalliSlab(), SdfSpriteIndices.CalliDominoSlab);
};


export const bakeSdfs = async () => {
    const gBox = createSdf(SdfBuilderOps.Box, 0.5, 0.05, 0.05).union(createSdf(SdfBuilderOps.Box, 0.1, 0.1, 0.1).translate(0.5));
    const guiermo = gBox.setMaterial(0).union(gBox.rotateXY(90).setMaterial(1)).union(gBox.rotateXZ(90).setMaterial(2));

    await sdfBakeToTexture(guiermo, SdfSpriteIndices.Guiermo);

    await bakeKukul();
    await bakeOlmec();
    await bakeNahuiOllin();
    await bakeCalli();

    const bulletRay = createSdf(SdfBuilderOps.Sphere, BulletRadius).setMaterial(MaterialIds.ColorDebug);
    await sdfBakeToTexture(bulletRay, SdfSpriteIndices.Bullet);


};