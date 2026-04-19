import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    RepeatUntilOptions,
    WaitOptions,
    WaitTimeoutError,
    repeatUntil,
    waitFor,
} from "../src/index";

type Deferred<T> = {
    promise: Promise<T>;
    reject: (reason?: unknown) => void;
    resolve: (value: T | PromiseLike<T>) => void;
};

describe("waitFor", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it("resolves immediately when the first check passes", async () => {
        const check = vi.fn(() => true);

        await expect(waitFor(check)).resolves.toBeUndefined();
        expect(check).toHaveBeenCalledTimes(1);
    });

    it("resolves after a later synchronous check passes", async () => {
        let attempts = 0;

        const promise = waitFor(() => {
            attempts += 1;
            return attempts === 3;
        }, {
            interval: 25,
            timeout: 100,
        });

        await vi.advanceTimersByTimeAsync(50);
        await expect(promise).resolves.toBeUndefined();
        expect(attempts).toBe(3);
    });

    it("resolves after a later asynchronous check passes", async () => {
        let attempts = 0;

        const promise = waitFor(async () => {
            attempts += 1;
            await Promise.resolve();
            return attempts === 2;
        }, {
            interval: 10,
            timeout: 50,
        });

        await vi.advanceTimersByTimeAsync(10);
        await expect(promise).resolves.toBeUndefined();
        expect(attempts).toBe(2);
    });

    it("retries thrown and rejected checks before succeeding", async () => {
        let attempts = 0;

        const promise = waitFor(() => {
            attempts += 1;

            if (attempts === 1) {
                throw new Error("first");
            }

            if (attempts === 2) {
                return Promise.reject(new Error("second"));
            }

            return true;
        }, {
            interval: 20,
            timeout: 100,
        });

        await vi.advanceTimersByTimeAsync(40);
        await expect(promise).resolves.toBeUndefined();
        expect(attempts).toBe(3);
    });

    it("times out with exact elapsed time, attempts, lastError, and cause", async () => {
        let lastError: Error | undefined;

        const promise = waitFor(() => {
            lastError = new Error(`failure ${performance.now()}`);
            throw lastError;
        }, {
            interval: 100,
            timeout: 250,
        });
        const errorPromise = promise.catch((value) => value);

        await vi.advanceTimersByTimeAsync(250);
        const error = await errorPromise;

        expect(error).toBeInstanceOf(WaitTimeoutError);
        expect(error.attempts).toBe(3);
        expect(error.elapsedMs).toBe(250);
        expect(error.lastError).toBe(lastError);
        expect(error.cause).toBe(lastError);
    });

    it("does not arm a timeout timer when timeout is Infinity", async () => {
        const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

        await expect(waitFor(() => true, { timeout: Infinity })).resolves.toBeUndefined();
        expect(setTimeoutSpy).not.toHaveBeenCalled();
    });

    it("times out coherently with timeout 0 when the first attempt does not settle", async () => {
        const deferred = createDeferred<boolean>();
        const promise = waitFor(() => deferred.promise, { timeout: 0 });
        const errorPromise = promise.catch((value) => value);

        await vi.advanceTimersByTimeAsync(0);
        const error = await errorPromise;

        expect(error).toBeInstanceOf(WaitTimeoutError);
        expect(error.attempts).toBe(1);
        expect(error.elapsedMs).toBe(0);
    });

    it("still succeeds with timeout 0 when the first attempt passes synchronously", async () => {
        await expect(waitFor(() => true, { timeout: 0 })).resolves.toBeUndefined();
    });

    it("uses interval 0 without overlapping attempts", async () => {
        let attempts = 0;
        let inFlight = 0;
        let maxInFlight = 0;

        const promise = waitFor(async () => {
            attempts += 1;
            inFlight += 1;
            maxInFlight = Math.max(maxInFlight, inFlight);
            await Promise.resolve();
            inFlight -= 1;
            return attempts === 3;
        }, {
            interval: 0,
            timeout: 10,
        });

        await vi.runAllTimersAsync();
        await expect(promise).resolves.toBeUndefined();
        expect(maxInFlight).toBe(1);
        expect(attempts).toBe(3);
    });

    it("rejects immediately for an already aborted signal", async () => {
        const controller = new AbortController();
        controller.abort("stop now");

        await expect(waitFor(() => true, { signal: controller.signal })).rejects.toBe(
            "stop now",
        );
    });

    it("rejects when aborted during the delay between attempts", async () => {
        const controller = new AbortController();
        const promise = waitFor(() => false, {
            interval: 100,
            signal: controller.signal,
            timeout: Infinity,
        });

        await vi.advanceTimersByTimeAsync(50);
        controller.abort("delay abort");

        await expect(promise).rejects.toBe("delay abort");
    });

    it("rejects when aborted during an in-flight async attempt", async () => {
        const controller = new AbortController();
        const deferred = createDeferred<boolean>();
        const promise = waitFor(() => deferred.promise, {
            signal: controller.signal,
            timeout: Infinity,
        });

        controller.abort("attempt abort");

        await expect(promise).rejects.toBe("attempt abort");
    });

    it("supports bare abort() reasons", async () => {
        const controller = new AbortController();
        const promise = waitFor(() => false, {
            interval: 50,
            signal: controller.signal,
            timeout: Infinity,
        });

        controller.abort();

        await expect(promise).rejects.toBe(controller.signal.reason);
    });

    it("balances abort listener setup and cleanup on success", async () => {
        const controller = new AbortController();
        const addEventListenerSpy = vi.spyOn(controller.signal, "addEventListener");
        const removeEventListenerSpy = vi.spyOn(controller.signal, "removeEventListener");

        await waitFor(() => true, { signal: controller.signal });

        expect(addEventListenerSpy).toHaveBeenCalledTimes(1);
        expect(removeEventListenerSpy).toHaveBeenCalledTimes(1);
        expect(removeEventListenerSpy.mock.calls[0]?.[0]).toBe("abort");
        expect(removeEventListenerSpy.mock.calls[0]?.[1]).toBe(
            addEventListenerSpy.mock.calls[0]?.[1],
        );
    });

    it("balances abort listener setup and cleanup on timeout", async () => {
        const controller = new AbortController();
        const addEventListenerSpy = vi.spyOn(controller.signal, "addEventListener");
        const removeEventListenerSpy = vi.spyOn(controller.signal, "removeEventListener");

        const promise = waitFor(() => false, {
            interval: 50,
            signal: controller.signal,
            timeout: 50,
        });
        const errorPromise = promise.catch((value) => value);

        await vi.advanceTimersByTimeAsync(50);
        await expect(errorPromise).resolves.toBeInstanceOf(WaitTimeoutError);

        expect(addEventListenerSpy).toHaveBeenCalledTimes(1);
        expect(removeEventListenerSpy).toHaveBeenCalledTimes(1);
    });

    it("balances abort listener setup and cleanup on abort", async () => {
        const controller = new AbortController();
        const addEventListenerSpy = vi.spyOn(controller.signal, "addEventListener");
        const removeEventListenerSpy = vi.spyOn(controller.signal, "removeEventListener");

        const promise = waitFor(() => false, {
            interval: 50,
            signal: controller.signal,
            timeout: Infinity,
        });

        controller.abort("abort cleanup");
        await expect(promise).rejects.toBe("abort cleanup");

        expect(addEventListenerSpy).toHaveBeenCalledTimes(1);
        expect(removeEventListenerSpy).toHaveBeenCalledTimes(1);
    });

    it("does not surface an unhandled rejection after abort wins first", async () => {
        const controller = new AbortController();
        const deferred = createDeferred<boolean>();
        const unhandledRejection = vi.fn();

        process.on("unhandledRejection", unhandledRejection);

        try {
            const promise = waitFor(() => deferred.promise, {
                signal: controller.signal,
                timeout: Infinity,
            });

            controller.abort("abort first");
            await expect(promise).rejects.toBe("abort first");

            deferred.reject(new Error("late failure"));
            await Promise.resolve();
            await Promise.resolve();

            expect(unhandledRejection).not.toHaveBeenCalled();
        } finally {
            process.off("unhandledRejection", unhandledRejection);
        }
    });

    it("throws synchronously for invalid waitFor input", () => {
        expect(() => waitFor("nope" as never)).toThrowError(
            new TypeError("check must be a function."),
        );

        expect(() => waitFor(() => true, null as never)).toThrowError(
            new TypeError("options must be an object."),
        );

        expect(() => waitFor(() => true, { interval: -1 })).toThrowError(
            new RangeError(
                "interval must be a finite number greater than or equal to 0.",
            ),
        );

        expect(() => waitFor(() => true, { timeout: -1 })).toThrowError(
            new RangeError(
                "timeout must be Infinity or a finite number greater than or equal to 0.",
            ),
        );
    });
});

describe("repeatUntil", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it("passes the raw task result to until", async () => {
        const value = { status: "ready" };
        const until = vi.fn((input: typeof value) => input.status === "ready");

        const result = await repeatUntil(async () => value, {
            until,
        });

        expect(result).toBe(value);
        expect(until).toHaveBeenCalledWith(value, undefined);
    });

    it("resolves with the final task result once until passes", async () => {
        let attempt = 0;

        const promise = repeatUntil(async () => {
            attempt += 1;
            return attempt;
        }, {
            interval: 25,
            timeout: 100,
            until: (value) => value === 3,
        });

        await vi.advanceTimersByTimeAsync(50);
        await expect(promise).resolves.toBe(3);
    });

    it("handles asynchronous task and until functions", async () => {
        let attempt = 0;

        const promise = repeatUntil(async () => {
            attempt += 1;
            await Promise.resolve();
            return attempt;
        }, {
            interval: 10,
            timeout: 50,
            until: async (value) => {
                await Promise.resolve();
                return value === 2;
            },
        });

        await vi.advanceTimersByTimeAsync(10);
        await expect(promise).resolves.toBe(2);
    });

    it("does not call until for failed task attempts", async () => {
        const until = vi.fn((value: number) => value === 2);
        let attempt = 0;

        const promise = repeatUntil(() => {
            attempt += 1;

            if (attempt === 1) {
                throw new Error("broken");
            }

            return 2;
        }, {
            interval: 10,
            timeout: 50,
            until,
        });

        await vi.advanceTimersByTimeAsync(10);
        await expect(promise).resolves.toBe(2);
        expect(until).toHaveBeenCalledTimes(1);
        expect(until).toHaveBeenCalledWith(2, undefined);
    });

    it("rejects immediately when until throws", async () => {
        const untilError = new Error("bad until");
        const task = vi.fn(() => 1);

        await expect(
            repeatUntil(task, {
                interval: 10,
                timeout: 50,
                until: () => {
                    throw untilError;
                },
            }),
        ).rejects.toBe(untilError);

        expect(task).toHaveBeenCalledTimes(1);
    });

    it("rejects immediately when until rejects", async () => {
        const untilError = new Error("bad async until");
        const task = vi.fn(() => 1);

        await expect(
            repeatUntil(task, {
                interval: 10,
                timeout: 50,
                until: async () => Promise.reject(untilError),
            }),
        ).rejects.toBe(untilError);

        expect(task).toHaveBeenCalledTimes(1);
    });

    it("retries failed task attempts until a later success", async () => {
        let attempt = 0;

        const promise = repeatUntil(() => {
            attempt += 1;

            if (attempt < 3) {
                return Promise.reject(new Error("retry me"));
            }

            return 3;
        }, {
            interval: 20,
            timeout: 100,
            until: (value) => value === 3,
        });

        await vi.advanceTimersByTimeAsync(40);
        await expect(promise).resolves.toBe(3);
        expect(attempt).toBe(3);
    });

    it("times out after repeated failed task attempts", async () => {
        const lastError = new Error("still broken");

        const promise = repeatUntil(() => Promise.reject(lastError), {
            interval: 40,
            timeout: 100,
            until: (value: never) => Boolean(value),
        });
        const errorPromise = promise.catch((value) => value);

        await vi.advanceTimersByTimeAsync(100);
        const error = await errorPromise;

        expect(error).toBeInstanceOf(WaitTimeoutError);
        expect(error.attempts).toBe(3);
        expect(error.elapsedMs).toBe(100);
        expect(error.lastError).toBe(lastError);
        expect(error.cause).toBe(lastError);
    });

    it("rejects when aborted between attempts", async () => {
        const controller = new AbortController();
        const promise = repeatUntil(() => 1, {
            interval: 100,
            signal: controller.signal,
            timeout: Infinity,
            until: () => false,
        });

        await vi.advanceTimersByTimeAsync(50);
        controller.abort("repeat abort");

        await expect(promise).rejects.toBe("repeat abort");
    });

    it("passes the active signal into task and until", async () => {
        const controller = new AbortController();
        const task = vi.fn((signal?: AbortSignal) => signal);
        const until = vi.fn(() => true);

        await repeatUntil(task, {
            signal: controller.signal,
            until,
        });

        expect(task).toHaveBeenCalledWith(controller.signal);
        expect(until).toHaveBeenCalledWith(controller.signal, controller.signal);
    });

    it("throws synchronously for invalid repeatUntil input", () => {
        expect(() =>
            repeatUntil("nope" as never, {
                until: () => true,
            } as RepeatUntilOptions<unknown>),
        ).toThrowError(new TypeError("task must be a function."));

        expect(() => repeatUntil(() => true, undefined as never)).toThrowError(
            new TypeError("options must be an object."),
        );

        expect(() =>
            repeatUntil(() => true, {
                until: "nope" as never,
            }),
        ).toThrowError(new TypeError("until must be a function."));
    });
});

it("accepts exported option types", () => {
    const waitOptions: WaitOptions = {
        interval: 10,
        timeout: Infinity,
    };
    const repeatOptions: RepeatUntilOptions<number> = {
        interval: 10,
        timeout: Infinity,
        until: (value) => value === 1,
    };

    expect(waitOptions.interval).toBe(10);
    expect(repeatOptions.until(1)).toBe(true);
});

function createDeferred<T>(): Deferred<T> {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;

    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });

    return {
        promise,
        reject,
        resolve,
    };
}
