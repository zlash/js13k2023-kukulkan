/*

# ZeptoFM

 Mono
 
 Instruments and patterns created with code. Easier for procedural stuff and shouldn't affect final size too much thanks to minifier.
 Pre rendered instruments, realtime patterns
 Intended for use with a minifier. Not golfed or anything.
 Practically no error checking


 A number is a "DC offset" sampler. It returns always itself.
 An array is treated as a "multiply" sampler. It multiplies all its members.
*/

"use strict";

import { Eps, Pi, abs, clamp, cos, floor, fract, invLerp, max, pow, random, randomRange, remapClamped, saturate, sin } from "~aliasedFunctions";

let outputSamplingRate = 44100;
let globalSampleCounter = 0;

type Sampler = number | Array<Sampler> | { (itself: Sampler): number; time: number; lastSample: number; lastSampledTimestamp: number; };

const Sample = (sampler: Sampler): number => {
    if (typeof (sampler) == "number") {
        return sampler;
    }
    if (sampler instanceof Array) {
        return sampler.reduce((accum: number, cur) => accum * Sample(cur), 1);
    }
    const lastSampledTs = sampler.lastSampledTimestamp ?? -1;
    if (lastSampledTs < globalSampleCounter) {
        sampler.time = sampler.time ?? 0;
        sampler.lastSample = sampler(sampler);
        sampler.time += 1 / outputSamplingRate;
        sampler.lastSampledTimestamp = globalSampleCounter;
    }
    return sampler.lastSample;
};

// Types: "s"ine, s"q"uare, "t"riangle, sa"w"tooth, "n"o band limited square,
// Non-sine waves are band limited by additive synthesis by default
// (Maybe try BLIT to be able to change duty cycles and better performance)
export const Oscillator = (type: "s" | "q" | "t" | "w" | "n", freq: Sampler, sync?: Sampler) => {
    let phase = 0;
    let prevSync = 0;

    const BandlimitedWave = (phase: number) => {
        let i = 0, a = 0;
        for (; i < 6; ++i) {
            const oddHarmNumber = 2 * i + 1;
            const alternating = i == 0 ? 1 : -1;
            if (type == "q") {
                a += sin(oddHarmNumber * phase) / oddHarmNumber;
            } else if (type == "t") {
                a += alternating * sin(oddHarmNumber * phase) / (oddHarmNumber * oddHarmNumber);
            } else if (type == "w") {
                a += alternating * sin(i * phase) / (i + 1);
            }
        }
        return a;
    };

    return (() => {
        const curSync = sync ? (Sample(sync) == 1 ? 1 : 0) : 0;
        if (curSync > prevSync) {
            phase = 0;
        }
        prevSync = curSync;
        const out = type == "n" ? (floor(fract(phase) * 2) * 2 - 1) : ((type == "s" ? sin : BandlimitedWave)(phase * 2 * Pi));
        phase += Sample(freq) / outputSamplingRate;
        return out;
    }) as any as Sampler;
};

export const Noise = () => {
    return (() => randomRange(-1, 1)) as any as Sampler;
};


// Frequency is not a sampler! Just a number. Can't be modified during playing
const KarplusStrong = (freq: number, initialAmplitude: number) => {
    const N = (outputSamplingRate / freq) | 0;
    let buffer = new Float32Array(Array.from(Array(N), () => randomRange(-1, 1) * initialAmplitude));
    return () => {
        const pos = globalSampleCounter % N;
        const out = buffer[pos];
        buffer[pos] = (out + buffer[(pos + 1) % N] + buffer[(pos + 2) % N]) / 3;
        return out;
    };
};

export const ADSR = (heldDuration: number, aTime: number, dTime: number, sLvl: number, rTime: number) => {
    const beforeSustainTime = aTime + dTime;
    const releaseTime = heldDuration + beforeSustainTime;

    return ((sampler: Exclude<Sampler, number | Array<Sampler>>) => {
        const t = sampler.time;
        const A = saturate(invLerp(0, aTime, t));
        const SR = sLvl * (1 - saturate(invLerp(releaseTime, releaseTime + rTime, t)));
        const D = beforeSustainTime == 0 ? SR : remapClamped(t, aTime, aTime + dTime, A, SR);
        return D;
    }) as any as Sampler;
};


/*
Types: `l`owpass, `h`i-pass

Parameters for specializations from: 
https://shepazu.github.io/Audio-EQ-Cookbook/audio-eq-cookbook.html

*/
export const BiQuadFilter = (src: Sampler, type: "l" | "h", centerFreqSampler: Sampler, paramSampler: Sampler) => {
    let x0 = 0, x1 = 0;
    let y0 = 0, y1 = 0;
    return (() => {
        const sample = Sample(src);
        const centerFreq = Sample(centerFreqSampler);
        const param = Sample(paramSampler);
        let a0, a1, a2, b0, b1, b2;

        const w0 = 2 * Pi * centerFreq / outputSamplingRate;
        const cosW0 = cos(w0);
        const sinW0 = sin(w0);

        // Form param type Q 
        let alpha = param == 0 ? 0 : sinW0 / (2 * param);

        // Low/Hi=pass
        const lhpfSign = type == "h" ? 1 : -1;
        b0 = (1 + lhpfSign * cosW0) / 2;
        b1 = -lhpfSign - cosW0;
        b2 = b0;
        a0 = 1 + alpha;
        a1 = -2 * cosW0;
        a2 = 1 - alpha;

        const out = clamp(b0 / a0 * sample + b1 / a0 * x0 + b2 / a0 * x1 - a1 / a0 * y0 - a2 / a0 * y1, -1, 1);

        x1 = x0;
        x0 = sample;
        y1 = y0;
        y0 = out;

        return out;
    }) as any as Sampler;
};

export const AddSamplers = (...samplers: Array<Sampler>) => {
    return (() => samplers.reduce((accum: number, cur) => accum + Sample(cur), 0)) as any as Sampler;
};

export const SemistepsFactor = (semis: number) => pow(2, semis / 12);

/*
Returns an AudioBufferSourceNode with content generated from `sampler`.
Sampler is called once for each sample without parameters and must return the current sample.
*/
export const RenderSamplerToFloatArray = (sampler: Sampler, duration: number) => {
    globalSampleCounter = 0;
    const samples = new Float32Array(outputSamplingRate * duration);
    for (let i = 0; i < samples.length; ++i) {
        samples[i] = Sample(sampler);
        ++globalSampleCounter;
    }
    return samples;

};

export const AudioBufferFromFloatSamples = (audioCtx: AudioContext, samples: Float32Array) => {
    const buffer = audioCtx.createBuffer(1, samples.length, outputSamplingRate);
    buffer.copyToChannel(samples, 0);
    return buffer;
};

export const NoteNumberToFreq = (note: number) => pow(2, (note - 69) / 12) * 440;

/*
    RenderInstrument takes an `instrumentSampler` which is a function with the signature
    (frequency, noteNumber) => sampler
    The result is an array with 128 elements, one from each note (indexed using MIDI tuning standard
    that puts A440 at 69), each points to a buffer and a speed adjustment. 
    The buffers will be repeated when samples are not rendered
    but the speed will be corrected so it plays at the frequency expected for that note
    position.
    Use start, end, increment to determine the range of notes to render. (start and end are fractional octaves)
    Notes outside the range will be played resampling the rendered notes.
*/
const RenderInstrument = (audioCtx: AudioContext, instrumentSampler: (frequency: number, noteNumber: number) => Sampler, noteRenderDuration: number, start: number, end: number, increment: number) => {
    let notes = [] as Array<[AudioBuffer, number]>;
    /* 
        for (let i = (start * 12) | 0; i <= ((end * 12) | 0); i += increment) {
            // Third element set to true to mark as a "true" sample when searching for closest matches
            notes[i] = [RenderSampler(audioCtx, instrumentSampler(NoteNumberToFreq(i), i), noteRenderDuration), 1, true];
        }
    
        for (let i = 0; i < 128; ++i) {
            if (!notes[i]) {
                let closest = -1;
                let closestDist = 200;
                for (let j = 0; j < 128; ++j) {
                    const dist = abs(i - j);
                    if ((notes[j] ?? [])[2] && dist < closestDist) {
                        closest = j;
                        closestDist = dist;
                    }
                }
                notes[i] = [notes[closest][0], NoteNumberToFreq(i) / NoteNumberToFreq(closest)];
            }
        } */
    return notes as Array<[AudioBuffer, number]>;
};

export const PlayAudioBuffer = (audioCtx: AudioContext, buffer: AudioBuffer, rate?: number, dest?: AudioNode, when?: number) => {
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(dest ?? audioCtx.destination);
    source.playbackRate.value = rate ?? 1;
    source.start(when ?? 0);
}

const PlayNote = (audioCtx: AudioContext, dest: AudioNode, renderedInstrument: ReturnType<typeof RenderInstrument>, i: number, when: number) => {
    const n = renderedInstrument[i];
    PlayAudioBuffer(audioCtx, n[0], n[1], dest, when);
}

/*
    A sequence is a string similar to MML
    renderedInstrument is a rendered instrument that will be used with PlayNote
    Letters from "a" to "g" set the note. Use # to for sharp
    "r" means a rest
    A number after a note or a rest sets the current note duration denominator (ie  4 = 1/4)
    "o" followed by a number sets the octave
    ">" and "<" raises and lowers octave
    "t" followed by a number sets BPM
    "v" followed by a number sets volume (0 to 10)

    Returns a function that must be called periodically to schedule new beats in the sound context
*/

const eventsSchedulingLookaheadSeconds = 50.5;

const PseudoMMLSequencer = (audioCtx: AudioContext, renderedInstrument: ReturnType<typeof RenderInstrument>, sequence: string, trackGain: number) => {
    let bpm = 120;
    let octave = 4;
    let noteValue = 4;
    let volume = 10;

    const getCommand = () => {
        const commands = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b", "r", "o", ">", "<", "t", "v"];
        const cmd = commands.findLastIndex(x => sequence.startsWith(x));
        sequence = sequence.slice((commands[cmd] ?? "").length);
        return cmd;
    };

    const getNumber = () => {
        const n = parseInt(sequence, 10);
        if (isNaN(n)) {
            return 0;
        }
        sequence = sequence.slice(`${n}`.length);
        return n;
    };

    const gainNode = audioCtx.createGain();
    gainNode.gain.value = trackGain;
    gainNode.connect(audioCtx.destination);

    let currentTimestamp: number;

    return () => {
        const curTime = audioCtx.currentTime;
        currentTimestamp = currentTimestamp ?? curTime;
        let lookaheadTimestamp = curTime + eventsSchedulingLookaheadSeconds;
        while (sequence != "" && currentTimestamp <= lookaheadTimestamp) {
            let cmd = getCommand();
            if (cmd < 0) return;

            if (cmd <= 12) {
                if (cmd == 12) {
                    // Rest
                } else {
                    PlayNote(audioCtx, gainNode, renderedInstrument, 12 * octave + cmd, currentTimestamp);
                }

                const newNoteValue = getNumber();
                if (newNoteValue) {
                    noteValue = newNoteValue;
                }


                currentTimestamp += 240 / (bpm * noteValue);
            }

            switch (cmd) {
                case 13: //o
                    octave = getNumber();
                    break;
                case 14: //">"
                    ++octave;
                    break;
                case 15: //"<"
                    --octave;
                    break;
                case 16: //t
                    bpm = getNumber();
                    break;
                case 17://volume
                    volume = getNumber();
                    gainNode.gain.setValueAtTime(trackGain * volume / 10, currentTimestamp);
                    break;
            }
        }
        /*Grab commands. While commands' timestamps are less than current+window*/
    };

};
