var assert = require("assert");
var simple = require("simple-mock");
var childProcess = require("child_process");
var watchdog = require("../../main/player/watchdog.js");
var mocks = {};

global.log = global.log || {external: console.log, debug: console.log, error:  console.log};
mocks.watchdog = {
  send: simple.stub(),
  on: simple.stub(),
  kill: simple.stub(),
  unref: simple.stub()
};

describe("watchdog", ()=>{
  beforeEach(()=>{
    simple.mock(log, "external").returnWith();
    simple.mock(log, "debug").returnWith();
    simple.mock(childProcess, "fork").returnWith(mocks.watchdog);
    global.secondMillis = 5;
  });

  afterEach(()=>{
    watchdog.quit();
    simple.restore();

    // Reset mocks
    Object.keys(mocks).forEach((mockName)=>{
      Object.keys(mocks[mockName]).forEach((key)=>{
        mocks[mockName][key].reset && mocks[mockName][key].reset();
      });
    });
  });

  it("exists", ()=>assert(!!watchdog));

  describe("init", ()=>{
    it("starts watchdog process", ()=>{
      simple.mock(watchdog, "initializeCommunication");
      watchdog.init();
      assert(childProcess.fork.called);
      assert(mocks.watchdog.unref.called);
      assert(watchdog.initializeCommunication.called);
    });
  });

  describe("send", ()=>{
    it("sends messages to the watchdog process", ()=>{
      watchdog.send();
      assert(mocks.watchdog.send.called);
    });
  });

  describe("initializeCommunication", ()=>{
    beforeEach(()=>{
      simple.mock(log, "external").returnWith();
      simple.mock(watchdog, "send");
    });

    it("sends pings to the watchdog", (done)=>{
      watchdog.init();
      setTimeout(()=>{
        assert(watchdog.send.called);
        done();
      }, 100);
    });

    it("logs to BQ if it doesn't receive pong", (done)=>{
      watchdog.init();
      setTimeout(()=>{
        assert(log.external.called);
        done();
      }, 200);
    });

    it("doesn't log to BQ if it receives pong", (done)=>{
      simple.restore(watchdog, "send");
      assert(!log.external.called);
      watchdog.init();
      var call = mocks.watchdog.on.calls[0];
      var handler = call.args[1];
      simple.mock(watchdog, "send").callFn(()=>{
        handler({
          message: "pong",
          to: "mainProcess"
        });
      });

      setTimeout(()=>{
        assert(!log.external.called);
        done();
      }, 200);
    });

  });
});
