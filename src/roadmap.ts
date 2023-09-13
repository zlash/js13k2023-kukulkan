import { fract } from "~aliasedFunctions";
import { renderText } from "~font";
import { BossNames, bossesPath } from "~gameSession";
import { wasInputPressed, InputA } from "~input";
import { vec2, vec4 } from "~juvec";
import { setMode, ModeGame } from "~main";

let clock: number;
export const roadmapInit = () => {

    clock = 0;
};

export const roadmapLoop = (dts: number) => {
    clock += dts;


    renderText("ROADMAP", vec2(300, 700), 30, true, vec4(1, 0, 0, 1));
    for (let i = 0; i < 3; ++i) {
        renderText(["NOON", "SUNSET", "NIGHT"][i], vec2(50, 600 - i * 26), 24);
        renderText(BossNames[bossesPath[i]], vec2(400, 600 - i * 26), 24, true);
    }

    if (clock > 2) {
        if (fract(clock) < 0.5) {
            renderText("PRESS SHOOT TO CONTINUE", vec2(300, 200), 20, true);
        }

        if (wasInputPressed(InputA)) {
            setMode(ModeGame);
        }
    }
};

