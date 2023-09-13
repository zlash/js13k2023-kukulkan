import { shuffleArray } from "~aliasedFunctions";
import { setMode, ModeRoadmap, ModeGame } from "~main";

export let playerLives: number;
export let bossesPath: number[];
export let sessionStage: number;

export const Day = 0;
export const Sunset = 1;
export const Night = 2;
export let timeOfDay = Day;


export const BossOlmec = 0;
export const BossNahuiOllin = 1;
export const BossCalli = 2;

export const BossNames = ["COLOSSAL HEAD X", "NAHUI OLLIN", "CALLI"];

export const initGameSession = () => {
    playerLives = 3;
    bossesPath = shuffleArray([BossOlmec, BossNahuiOllin, BossCalli]);

    sessionStage = 0;
    timeOfDay = sessionStage;
};

export const initDebugGame = (params: URLSearchParams) => {
    initGameSession();
    const bossString = params.get("boss");
    if (bossString) {
        const boss = {
            "olmec": BossOlmec,
            "nahui": BossNahuiOllin,
            "calli": BossCalli,
        }[bossString] as number;
        bossesPath = [boss, boss, boss];
    }
    const todString = params.get("tod");
    if (todString) {
        const tod = {
            "day": Day,
            "sunset": Sunset,
            "night": Night,
        }[todString] as number;
        timeOfDay = tod;
    }
    setMode(ModeGame);
};


export const goToNextStage = () => {
    ++sessionStage;
    timeOfDay = sessionStage;
    setMode(ModeRoadmap);
};

export const loseLive = () => {
    --playerLives;
};

export const UpgradeExtraLife = 0;
export const UpgradeExtraSpeed = 1;
export const UpgradeExtraDamage = 2;
export const UpgradeTripleShot = 3;

export const UpgradesCount = 4;

export const upgradeNames = [
    "EXTRA LIFE",
    "SPEED UP",
    "DAMAGE UP",
];

export const applyUpgrade = (upgrade: number) => {
    if (upgrade == UpgradeExtraLife) {
        ++playerLives;
    }
};
