import { repeatUntil, waitFor } from "mumford";

await waitFor(() => true);

const result = await repeatUntil(async () => 1, {
    until: (value) => value === 1,
});

result satisfies number;
