# mumford

I Will Wait (for You), but only as a tiny abortable polling toolkit.

`mumford` is a small Node-first utility for waiting on async conditions without dragging in a heavy dependency tree. It gives you two promise-native primitives:

- `waitFor` for readiness checks
- `repeatUntil` for running work until the result is acceptable

No legacy chaining. No global queue. No runtime dependencies.

## Install

```bash
npm install mumford
```

Node `>=20` is supported.

## waitFor

Use `waitFor` when you already have a condition and just need to keep checking until it becomes `true`.

```ts
import { waitFor } from "mumford";

await waitFor(async () => {
    const response = await fetch("http://localhost:3000/health");
    return response.ok;
}, {
    interval: 100,
    timeout: 5_000,
});
```

### options

- `interval`
  delay in milliseconds between settled attempts. defaults to `50`.
- `timeout`
  total wall-clock timeout in milliseconds. defaults to `Infinity`.
- `signal`
  optional `AbortSignal` for cooperative cancellation.

The first attempt starts immediately. Only one attempt is ever in flight at a time.

## repeatUntil

Use `repeatUntil` when you want to run work repeatedly and stop once the returned value passes a predicate.

```ts
import { repeatUntil } from "mumford";

const record = await repeatUntil(
    async () => {
        const response = await fetch("http://localhost:3000/jobs/latest");
        return response.json() as Promise<{ status: string }>;
    },
    {
        interval: 250,
        timeout: 10_000,
        until: (value) => value.status === "done",
    },
);
```

`repeatUntil` resolves with the final task result, not a wrapper around it.

## Timeouts, aborts, and failed attempts

- `timeout: Infinity` means polling can continue indefinitely.
- thrown or rejected `check()` / `task()` calls are treated as failed attempts and retried.
- thrown or rejected `until()` calls are treated as real errors and reject immediately.
- aborts reject immediately, including between attempts.

Timeouts reject with `WaitTimeoutError`, which includes:

- `attempts`
- `elapsedMs`
- `lastError`
- `cause`

## A little more than this

```ts
import { WaitTimeoutError, waitFor } from "mumford";

try {
    await waitFor(() => false, { timeout: 250 });
} catch (error) {
    if (error instanceof WaitTimeoutError) {
        console.error(error.attempts, error.elapsedMs, error.lastError);
    }
}
```

## Migration from mumford 0.x

This is a clean break from the old `when().then()` and `doUntil().then()` API.

### before

```js
when(isReady).then(function () {
    startApp();
});
```

### after

```ts
await waitFor(isReady);
startApp();
```

For repeated async work, replace `doUntil()` with `repeatUntil()`.

## Licence

MIT
