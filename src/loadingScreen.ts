import { floor } from "~aliasedFunctions";
import { renderSamples } from "~audio";
import { DEBUG } from "~autogenerated";
import { renderText } from "~font";
import { initDebugGame, initGameSession } from "~gameSession";
import { InputA, wasAnyKeyPressed, wasInputPressed } from "~input";
import { vec2 } from "~juvec";
import { ModeRoadmap, ModeTitlescreen, setMode } from "~main";
import { bakeTextures } from "~renderer";
import { bakeSdfs } from "~sdfSprites";

export const loadingData = {
    toLoad: 0,
    loaded: 0,
};

let loadStuffPromise: Promise<void>;
let urlParams: (URLSearchParams | null);
let loaded = false;

export const loadScreenInit = () => {
    (async () => {
        bakeTextures();
        await bakeSdfs();
        renderSamples();
    })().then(() => {
        loaded = true;

    });
};

export const loadScreenLoop = (dts: number) => {

    const loadingK = loadingData.loaded / loadingData.toLoad;



    if (loaded) {
        renderText("PRESS A BUTTON OR KEY", vec2(300, 400), 24, true);
        if (wasAnyKeyPressed()) {
            if (DEBUG) {
                urlParams = new URLSearchParams(window.location.search);
            }

            if (DEBUG && urlParams && urlParams.get("boss")) {
                initDebugGame(urlParams);
            } else {
                setMode(ModeTitlescreen);
            }
        }
    }else{
    renderText("LOADING", vec2(300, 400), 24, true);
    renderText(`${floor(loadingK * 100)}`, vec2(300, 360), 24, true);
    }
};

