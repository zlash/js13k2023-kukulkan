import { cos, fract, mod, sin, smoothstep } from "~aliasedFunctions";
import { renderText } from "~font";
import { initGameSession } from "~gameSession";
import { InputA, wasAnyKeyPressed, wasInputPressed } from "~input";
import { mat4LookAt, vec2, vec3, vec4, vecSet, yAxis, zAxis, zeroVector } from "~juvec";
import { ModeRoadmap, setMode } from "~main";
import { Player, createPlayer } from "~player";
import { drawOrtho2d, setRenderFloorOn, viewMatrix } from "~renderer";


let titlePlayer: any;
let clock: number;
let mode: number;

const ModeBlackScreen = 0;
const ModeBlackScreenOut = 1;
const ModeNormal = 3;

export const titlescreenInit = () => {
    titlePlayer = createPlayer();
    titlePlayer.dummy = true;
    vecSet(titlePlayer.pos, 0, 0, 0);
    clock = 0;
    mode = ModeBlackScreen;
};

const blackScreenDuration = 3;

export const titlescreenLoop = (dts: number) => {

    clock += dts;

    switch (mode) {
        case ModeBlackScreen:
            if (clock >= blackScreenDuration) {
                clock -= blackScreenDuration;
                mode = ModeBlackScreenOut;
            }
            break;
        case ModeNormal:
            if (wasInputPressed(InputA)) {
                initGameSession();
                setMode(ModeRoadmap);
            }
            break;
    }

    const cr = 4;
    const cc = 0.6;
    const cx = cr * cos(clock * cc);
    const cy = cr * sin(clock * cc);
    mat4LookAt(vec3(cx, cy, 2.5), vec3(0, 0, 0), zAxis, viewMatrix);

    titlePlayer.pos[0] = 5 * sin(clock * 3);
    titlePlayer.update(dts);
    titlePlayer.render();


    renderText("KU", vec2(200, 600), 180, true);
    renderText("KUL", vec2(320, 400), 180, true);
    renderText("KAN", vec2(370, 200), 180, true);

    renderText("BY MIGUEL ANGEL PEREZ MARTINEZ", vec2(40, 70), 18);
    renderText("FOR JS13K 2023", vec2(40, 50), 18);

    if (mode == ModeBlackScreenOut && clock >= 2) {
        if (fract(clock * 2) < 0.5) {
            renderText("PRESS A BUTTON OR KEY TO START", vec2(300, 120), 18, true);
        }
        if (wasAnyKeyPressed()) {
            initGameSession();
            setMode(ModeRoadmap);
        }
    }

    const blackCardAlpha = mode == ModeBlackScreen ? 1 : smoothstep(1, 0, clock);

    drawOrtho2d(vec2(300, 400), vec2(600, 800), undefined, undefined, undefined, undefined, vec4(0, 0, 0, blackCardAlpha));

    const blackCardTextColor = vec4(1, 1, 1, blackCardAlpha);
    renderText("JS13K", vec2(270, 400), 20, true, blackCardTextColor);
    renderText("2023", vec2(360 + 400 * (1 - smoothstep(0, 1, mode == ModeBlackScreen ? clock : 1)), 400), 20, true, blackCardTextColor);

};

