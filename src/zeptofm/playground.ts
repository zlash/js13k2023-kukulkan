import { audioCtx, initSound, renderBassdrum, renderHitSfx, renderPad } from "../audio";
import { ADSR, AudioBufferFromFloatSamples, Oscillator, PlayAudioBuffer, RenderSamplerToFloatArray } from "./zeptofm";


let buf: AudioBuffer;

window.addEventListener('DOMContentLoaded', () => {

    window.addEventListener('mouseup', (event: MouseEvent) => {
        if (!audioCtx) {
            initSound();

            const samples = renderPad(53);

            buf = AudioBufferFromFloatSamples(audioCtx, samples);
        }

        PlayAudioBuffer(audioCtx, buf);
    }, true);

});
