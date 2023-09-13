/*
    width: period in seconds
    edge: true when it reaches the max. Cleared each update
*/

export interface SawishSignal {
    (dts: number): void;
    edge: boolean;
    count: number;
    value: number;
    invValue: number;
};

export const createSawishSignal = (width: number, initialClock?: number) => {
    let clock = initialClock ?? width;
    const ss = ((dts: number) => {
        clock -= dts;
        ss.edge = false;
        if (clock <= 0) {
            clock += width;
            ss.edge = true;
            ++ss.count;
        }
        ss.invValue = clock / width;
        ss.value = 1 - ss.invValue;
    }) as SawishSignal;
    ss.edge = false;
    ss.count = 0;
    return ss;
};