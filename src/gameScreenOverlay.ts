import { renderText } from "~font";
import { player } from "~game";
import { InputA, isInputDown, wasInputPressed } from "~input";
import { vec2 } from "~juvec";
import { drawOrtho2d } from "~renderer";
import * as Input from "./input";
import { fract, max, min, mod, shuffleArray } from "~aliasedFunctions";
import { UpgradeExtraLife, UpgradesCount, applyUpgrade, goToNextStage, sessionStage, upgradeNames } from "~gameSession";
import { setMode, ModeTitlescreen } from "~main";

export const GameScreenOverlayModeOff = 0;
export const GameScreenOverlayModeGameOver = 1;
export const GameScreenOverlayModeSelectUpgrade = 2;
export const GameScreenOverlayModeWon = 3;

export let gameOverlayMode: number;
let clock: number;

const inputLockDurationSeconds = 1.5;

let listCursorPos: number;

let upgradeOptions: number[];

export const setGameOverlayMode = (nextMode: number) => {
    if (nextMode == GameScreenOverlayModeSelectUpgrade && sessionStage == 2) {
        nextMode = GameScreenOverlayModeWon;
    }

    clock = 0;
    listCursorPos = 0;

    if (nextMode != GameScreenOverlayModeOff) {
        player.immortal = true;
    }

    if (nextMode == GameScreenOverlayModeSelectUpgrade) {
        upgradeOptions = shuffleArray(Array(UpgradesCount).fill(0).map((x, i) => i));
    }

    gameOverlayMode = nextMode;
};

export const gameScreenOverlayUpdate = (dts: number) => {
    clock += dts;
    if (gameOverlayMode == GameScreenOverlayModeGameOver || gameOverlayMode == GameScreenOverlayModeWon) {
        if (clock > inputLockDurationSeconds) {
            if (wasInputPressed(InputA)) {
                setMode(ModeTitlescreen);
            }
        }
    } else if (gameOverlayMode == GameScreenOverlayModeSelectUpgrade) {

        if (clock > inputLockDurationSeconds) {
            if (wasInputPressed(Input.InputA)) {
                // Apply update, go to next stage
                applyUpgrade(UpgradeExtraLife);
                goToNextStage();
            }
            /*             if (wasInputPressed(Input.InputUp)) {
                            listCursorPos = max(listCursorPos - 1, 0);
                        }
            
                        if (wasInputPressed(Input.InputDown)) {
                            listCursorPos = min(listCursorPos + 1, 1);
                        }
            
                        if (wasInputPressed(Input.InputA)) {
                            // Apply update, go to next stage
                            applyUpgrade(upgradeOptions[listCursorPos]);
                            goToNextStage();
                        } */
        }
    }
};

export const gameScreenOverlayRender = () => {
    if (gameOverlayMode == GameScreenOverlayModeOff) {
        return;
    }

    if (gameOverlayMode == GameScreenOverlayModeGameOver || gameOverlayMode == GameScreenOverlayModeWon) {
        renderText(gameOverlayMode == GameScreenOverlayModeWon ? "YOU ARE FREE" : "YOU ARE DEAD", vec2(300, 700), 34, true);
        renderText(gameOverlayMode == GameScreenOverlayModeWon ? "CONGRATULATIONS" : "PLEASE TRY AGAIN", vec2(300, 650), 23, true);
    } else if (gameOverlayMode == GameScreenOverlayModeSelectUpgrade) {
        renderText("GO TO NEXT STAGE", vec2(300, 700), 34, true);
        renderText("GOT AN EXTRA LIFE", vec2(300, 650), 23, true);


        /*         if (clock > inputLockDurationSeconds) {
                    for (let i = 0; i < 2; ++i) {
                        renderText(upgradeNames[upgradeOptions[i]], vec2(300, 400 - i * 60), 24);
                    }
        
                    drawOrtho2d(vec2(260, 400 - listCursorPos * 60), vec2(30, 30));
                } */
    }


    if (clock > inputLockDurationSeconds) {
        if (fract(clock) < 0.5) {
            renderText("PRESS SHOOT TO CONTINUE", vec2(300, 400), 22, true);
        }
    }
};