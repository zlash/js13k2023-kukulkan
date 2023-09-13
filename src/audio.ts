import { ADSR, AddSamplers, AudioBufferFromFloatSamples, BiQuadFilter, Noise, NoteNumberToFreq, Oscillator, PlayAudioBuffer, RenderSamplerToFloatArray, SemistepsFactor } from "./zeptofm/zeptofm";
import * as SfxIds from "./sfxIds";
import { assert } from "~aliasedFunctions";

const audioBuffers = [] as Array<AudioBuffer>;

export let audioCtx: AudioContext;
let outputSamplingRate: number;

export const initSound = () => {
    assert(!audioCtx);
    audioCtx = new window.AudioContext({ latencyHint: "interactive" });
    outputSamplingRate = audioCtx.sampleRate;

};

export const renderHitSfx = () => {
    const duration = 0.8;
    const noise = Noise();
    const noiseShape = ADSR(0, 0, 0, 1, duration);
    const lowpassed = BiQuadFilter(noise, "l", [noiseShape, 450], 1);
    return RenderSamplerToFloatArray([lowpassed, noiseShape, 1.2], duration) as any;
};

export const renderBassdrum = () => {
    const duration = 0.5;
    const env = ADSR(0, 0, 0, 1, duration);
    const triangle = BiQuadFilter(Oscillator("s", 60), "l", [env, 80], 0.5);

    return RenderSamplerToFloatArray([triangle, env, 4], duration) as any;
};

export const renderPad = (note:number) => {
    const f = NoteNumberToFreq(note);
    const duration = 3;
    const env = ADSR(0, 0, 0, 1, duration);
    const wave = AddSamplers(Oscillator("s", f), Oscillator("s", f * SemistepsFactor(4)), Oscillator("s", f * SemistepsFactor(7)));

    const filtered = BiQuadFilter(wave, "l", [env, 1000], [env, 1000]);
    return RenderSamplerToFloatArray([filtered, 0.2], duration) as any;
};

export let samplesRendered = false;
export const renderSamples = () => {
    {
        const duration = 0.2;
        const frequencyADSR = ADSR(0, 0, 0, 800, duration);
        const sawWave = Oscillator("w", frequencyADSR);
        audioBuffers[SfxIds.PEW] = RenderSamplerToFloatArray([sawWave, 0.1], duration) as any;
    }

    audioBuffers[SfxIds.HIT] = renderHitSfx();

    samplesRendered = true;
};

export const loadSamples = () => {
    for (let i = 0; i < SfxIds.COUNT; ++i) {
        audioBuffers[i] = AudioBufferFromFloatSamples(audioCtx, audioBuffers[i] as any);
    }
};

export const playSample = (id: number, rate?: number) => {
    PlayAudioBuffer(audioCtx, audioBuffers[id], rate);
};