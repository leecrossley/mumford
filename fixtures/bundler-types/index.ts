import {
    repeatUntil,
    waitFor,
    type RepeatUntilOptions,
    type WaitOptions,
} from "mumford";

const waitOptions: WaitOptions = {
    interval: 10,
    timeout: Infinity,
};

const repeatOptions: RepeatUntilOptions<number> = {
    interval: 10,
    timeout: 100,
    until: (value) => value === 1,
};

void waitFor(() => true, waitOptions);
void repeatUntil(async () => 1, repeatOptions);
