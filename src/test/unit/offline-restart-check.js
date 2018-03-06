const assert = require("assert");
const check = require("../../main/player/offline-restart-check");

describe("Offline Restart Check / Unit", () => {

  afterEach(() => check.reset());

  it("has count of 0 if no arguments", () => {
    const count = check.getCount([]);

    assert.equal(count, 0);
  });

  it("extracts count from arguments", () => {
    const count = check.getCount(['--unattended', '--offline-restart-count', '2']);

    assert.equal(count, 2);
  });

  it("extracts count from arguments", () => {
    const count = check.getCount(['--unattended', '--offline-restart-count=2']);

    assert.equal(count, 2);
  });

  it("should not be considered offline if offline-restart-count is missing", () => {
    const offline = check.shouldBeConsideredOffline(['--unattended']);

    assert(!offline);
  });

  it("should not be considered offline if offline-restart-count is less than 3", () => {
    const offline = check.shouldBeConsideredOffline(['--unattended', '--offline-restart-count=2']);

    assert(!offline);
  });

  it("should be considered offline if offline-restart-count is 3", () => {
    const offline = check.shouldBeConsideredOffline(['--unattended', '--offline-restart-count=3']);

    assert(offline);
  });

});
