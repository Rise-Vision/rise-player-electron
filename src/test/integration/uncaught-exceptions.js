const assert = require("assert");
const fs = require("fs-extra");
const platform = require("rise-common-electron").platform;
const simple = require("simple-mock");

const config = require("../../main/player/config");
const uncaughtExceptions = require("../../main/player/uncaught-exceptions");

describe("Uncaught Exceptions - Integration", () => {

  const cachedLog = global.log;
  const path = config.getUncaughtErrorFileName();

  beforeEach(done => {
    global.log = {
      all() {},
      file() {},
      external() {},
      error: simple.stub(),
      debug: console.log
    };

    fs.remove(path, () => done());
  });

  afterEach(() => simple.restore());
  after(() => global.log = cachedLog);

  it("should send error if an uncaught exception file exists", () => {
    return platform.writeTextFile(path, 'test error content')
    .then(() => {
      assert(platform.fileExists(path));

      return uncaughtExceptions.sendToBQ();
    })
    .then(() => {
      assert.equal(global.log.error.callCount, 1);
      assert.equal(global.log.error.lastCall.args[0], 'uncaught exception file found');
      assert.equal(global.log.error.lastCall.args[1], 'Uncaught exception: test error content');

      assert(!platform.fileExists(path));
    });
  });

  it("should not send error if no uncaught exception file exists", () => {
    assert(!platform.fileExists(path));

    return uncaughtExceptions.sendToBQ()
    .then(() => assert(!global.log.error.called));
  });

});