import { EntityUI } from "./gameEntityTypes";
import { GameEntity, gameEntityDefaultCreate } from "./game";
import { drawOrtho2d } from "~renderer";
import { vec2, vec4 } from "~juvec";
import { min, saturate } from "~aliasedFunctions";


export interface HpBar extends GameEntity {
    reset: (total: number) => void;
    updateCurrent: (current: number) => void;
};

export const createHpBar = () => {
    const bar = gameEntityDefaultCreate(EntityUI) as HpBar;

    let totalHp: number;
    let currentHp: number;
    let clock: number;
    let reloadClock: number;

    bar.reset = (total: number) => {
        totalHp = currentHp = total;
        clock = 0;
        reloadClock = 0;
    };

    bar.reset(0);

    bar.updateCurrent = (current: number) => {
        currentHp = current;
    };

    bar.update = (dts: number) => {
        clock += dts;
        reloadClock = saturate(reloadClock + dts);
    }

    bar.render = () => {
        if (totalHp > 0) {
            const barWidth = 500;
            const barHeight = 30;
            const currentWidth = barWidth * min(currentHp, totalHp * reloadClock) / totalHp;
            // todo: borrow!
            if (currentWidth > 0) {
                const barPosition = vec2((600 - barWidth + currentWidth) / 2, 750);
                drawOrtho2d(barPosition, vec2(currentWidth, barHeight), undefined, undefined, undefined, undefined, vec4(0.7, 0, 0, 0.8));
            }
        }
    };

    return bar;
};
