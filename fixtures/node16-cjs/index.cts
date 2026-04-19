import mumford = require("mumford");

void mumford.waitFor(() => true);
void mumford.repeatUntil(async () => 1, {
    until: (value) => value === 1,
});
