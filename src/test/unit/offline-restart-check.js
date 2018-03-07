const assert = require("assert");
const simple = require("simple-mock");

const check = require("../../main/player/offline-restart-check");
const subscriptionCheck = require("../../main/player/offline-subscription-check");
const restart = require("../../main/player/restart");

describe("Offline Restart Check / Unit", () => {

  beforeEach(() => {
    simple.mock(restart, "restart").returnWith();
  });

  afterEach(() => {
    check.reset();
    simple.restore();
  });

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
    const offline = check.shouldBeConsideredOffline(['--offline-restart-count=3']);

    assert(offline);
  });

  it("should not restart if it's already considered offline", () => {
    check.shouldBeConsideredOffline(['--offline-restart-count=3']);

    return check.startOfflineTimeoutIfRpp(action => action()).then(() => {
      assert(!restart.restart.called);
    });
  });

  it("should not restart if it's not Rise Player Professional", () => {
    simple.mock(subscriptionCheck, "isSubscribed").resolveWith(false);
    check.shouldBeConsideredOffline([]);

    return check.startOfflineTimeoutIfRpp(action => action()).then(() => {
      assert(!restart.restart.called);
    });
  });

  it("should restart if its Rise Player Professional and count is 0 and viewer has not started", () => {
    simple.mock(subscriptionCheck, "isSubscribed").resolveWith(true);
    check.shouldBeConsideredOffline([]);

    return check.startOfflineTimeoutIfRpp(action => action()).then(() => {
      assert(restart.restart.called);
      assert.deepEqual(restart.restart.lastCall.args[0], ["--offline-restart-count=1"]);
    });
  });

  it("should not restart if its Rise Player Professional and count is 0 and viewer has started", () => {
    simple.mock(subscriptionCheck, "isSubscribed").resolveWith(true);
    check.shouldBeConsideredOffline([]);

    return check.startOfflineTimeoutIfRpp(action => {
      check.markViewerAsStarted();
      action();
    })
    .then(() => {
      assert(!restart.restart.called);
    });
  });

  it("should restart if its Rise Player Professional and count is 2 and viewer has not started", () => {
    simple.mock(subscriptionCheck, "isSubscribed").resolveWith(true);
    check.shouldBeConsideredOffline(['--offline-restart-count=2']);

    return check.startOfflineTimeoutIfRpp(action => action()).then(() => {
      assert(restart.restart.called);
      assert.deepEqual(restart.restart.lastCall.args[0], ["--offline-restart-count=3"]);
    });
  });

});
