export type WaitOptions = {
    interval?: number;
    timeout?: number;
    signal?: AbortSignal;
};

export type RepeatUntilOptions<T> = WaitOptions & {
    until: (value: T, signal?: AbortSignal) => boolean | Promise<boolean>;
};

type ScheduledHandle =
    | {
          kind: "immediate";
          handle: ReturnType<typeof setImmediate>;
      }
    | {
          kind: "timeout";
          handle: ReturnType<typeof setTimeout>;
      };

type RetryableCallback<T> = (signal?: AbortSignal) => T | Promise<T>;

type PollOptions<T> = {
    interval: number;
    timeout: number;
    signal?: AbortSignal;
    task: RetryableCallback<T>;
    until: (value: T, signal?: AbortSignal) => boolean | Promise<boolean>;
};

const DEFAULT_INTERVAL = 50;

export class WaitTimeoutError extends Error {
    attempts: number;
    elapsedMs: number;
    lastError?: unknown;

    constructor(attempts: number, elapsedMs: number, lastError?: unknown) {
        const message = createTimeoutMessage(attempts, elapsedMs);

        if (lastError === undefined) {
            super(message);
        } else {
            super(message, { cause: lastError });
        }

        this.name = "WaitTimeoutError";
        this.attempts = attempts;
        this.elapsedMs = elapsedMs;
        this.lastError = lastError;
    }
}

export function waitFor(
    check: RetryableCallback<boolean>,
    options?: WaitOptions,
): Promise<void> {
    ensureFunction("check", check);

    const { interval, timeout, signal } = parseWaitOptions(options);

    return poll({
        interval,
        timeout,
        signal,
        task: check,
        until: (value) => value === true,
    }).then(() => undefined);
}

export function repeatUntil<T>(
    task: RetryableCallback<T>,
    options: RepeatUntilOptions<T>,
): Promise<T> {
    ensureFunction("task", task);

    if (options === undefined) {
        throw new TypeError("options must be an object.");
    }

    ensureFunction("until", options.until);

    const { interval, timeout, signal } = parseWaitOptions(options);

    return poll({
        interval,
        timeout,
        signal,
        task,
        until: options.until,
    });
}

function poll<T>({
    interval,
    timeout,
    signal,
    task,
    until,
}: PollOptions<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        let attempts = 0;
        let lastError: unknown;
        let settled = false;
        let retryHandle: ScheduledHandle | undefined;
        let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

        const startedAt = performance.now();

        const cleanup = () => {
            clearScheduledHandle(retryHandle);
            retryHandle = undefined;

            if (timeoutHandle !== undefined) {
                clearTimeout(timeoutHandle);
                timeoutHandle = undefined;
            }

            if (signal) {
                signal.removeEventListener("abort", handleAbort);
            }
        };

        const settleResolve = (value: T) => {
            if (settled) {
                return;
            }

            settled = true;
            cleanup();
            resolve(value);
        };

        const settleReject = (error: unknown) => {
            if (settled) {
                return;
            }

            settled = true;
            cleanup();
            reject(error);
        };

        const handleAbort = () => {
            settleReject(getAbortReason(signal));
        };

        const scheduleRetry = () => {
            if (settled) {
                return;
            }

            if (signal?.aborted) {
                handleAbort();
                return;
            }

            retryHandle = createScheduledHandle(interval, runAttempt);
        };

        const handleTimeout = () => {
            const elapsedMs = performance.now() - startedAt;
            settleReject(new WaitTimeoutError(attempts, elapsedMs, lastError));
        };

        const runAttempt = () => {
            if (settled) {
                return;
            }

            if (signal?.aborted) {
                handleAbort();
                return;
            }

            attempts += 1;

            const callbackPromise = Promise.resolve().then(() => task(signal));

            const handledPromise = callbackPromise.then(
                (value) =>
                    Promise.resolve(until(value, signal)).then((done) => {
                        if (settled) {
                            return;
                        }

                        if (done) {
                            settleResolve(value);
                            return;
                        }

                        scheduleRetry();
                    }),
                (error) => {
                    if (settled) {
                        return;
                    }

                    lastError = error;
                    scheduleRetry();
                },
            );

            void handledPromise.catch((error) => {
                if (settled) {
                    return;
                }

                settleReject(error);
            });
        };

        if (signal?.aborted) {
            settleReject(getAbortReason(signal));
            return;
        }

        if (signal) {
            signal.addEventListener("abort", handleAbort);
        }

        if (timeout !== Number.POSITIVE_INFINITY) {
            timeoutHandle = setTimeout(handleTimeout, timeout);
        }

        runAttempt();
    });
}

function parseWaitOptions(
    options?: WaitOptions,
): Required<Pick<WaitOptions, "interval" | "timeout">> & {
    signal?: AbortSignal;
} {
    if (options === undefined) {
        return {
            interval: DEFAULT_INTERVAL,
            timeout: Number.POSITIVE_INFINITY,
            signal: undefined,
        };
    }

    if (!isOptionsObject(options)) {
        throw new TypeError("options must be an object.");
    }

    const interval = options.interval ?? DEFAULT_INTERVAL;
    const timeout = options.timeout ?? Number.POSITIVE_INFINITY;

    assertValidInterval(interval);
    assertValidTimeout(timeout);

    return {
        interval,
        timeout,
        signal: options.signal,
    };
}

function createScheduledHandle(
    interval: number,
    callback: () => void,
): ScheduledHandle {
    if (interval === 0 && typeof setImmediate === "function") {
        return {
            kind: "immediate",
            handle: setImmediate(callback),
        };
    }

    return {
        kind: "timeout",
        handle: setTimeout(callback, interval),
    };
}

function clearScheduledHandle(handle?: ScheduledHandle): void {
    if (!handle) {
        return;
    }

    if (handle.kind === "immediate") {
        clearImmediate(handle.handle);
        return;
    }

    clearTimeout(handle.handle);
}

function createTimeoutMessage(attempts: number, elapsedMs: number): string {
    const attemptLabel = attempts === 1 ? "attempt" : "attempts";
    return `Operation timed out after ${elapsedMs}ms and ${attempts} ${attemptLabel}.`;
}

function getAbortReason(signal?: AbortSignal): unknown {
    if (!signal) {
        return new DOMException("This operation was aborted.", "AbortError");
    }

    if (signal.reason !== undefined) {
        return signal.reason;
    }

    return new DOMException("This operation was aborted.", "AbortError");
}

function isOptionsObject(value: unknown): value is WaitOptions {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ensureFunction(name: string, value: unknown): void {
    if (typeof value !== "function") {
        throw new TypeError(`${name} must be a function.`);
    }
}

function assertValidInterval(interval: number): void {
    if (!Number.isFinite(interval) || interval < 0) {
        throw new RangeError(
            "interval must be a finite number greater than or equal to 0.",
        );
    }
}

function assertValidTimeout(timeout: number): void {
    if (
        timeout !== Number.POSITIVE_INFINITY &&
        (!Number.isFinite(timeout) || timeout < 0)
    ) {
        throw new RangeError(
            "timeout must be Infinity or a finite number greater than or equal to 0.",
        );
    }
}
