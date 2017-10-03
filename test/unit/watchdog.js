var assert = require("assert");
var simple = require("simple-mock");
var childProcess = require("child_process");
var watchdog = require("../../player/watchdog.js");
var mocks = {};

mocks.watchdog = {
  send: simple.stub(),
  on: simple.stub(),
  unref: simple.stub()
};

describe("watchdog", ()=>{
  beforeEach(()=>{
    simple.mock(childProcess, "fork").returnWith(mocks.watchdog);
  });

  afterEach(()=>{
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
      watchdog.init();
    });

    it("sends pings to the watchdog", (done)=>{
      simple.mock(watchdog, "send");
      watchdog.initializeCommunication();
      setTimeout(()=>{
        assert(watchdog.send.called);
        done();
      }, 100);
    });

    it("logs to BQ if it doesn't receive pong", (done)=>{
      simple.mock(log, "external").returnWith();
      watchdog.initializeCommunication();
      setTimeout(()=>{
        assert(log.external.called);
        done();
      }, 200);
    });

    // Disabled due to timing issues
    xit("doesn't log to BQ if it receives pong", (done)=>setTimeout(()=>{
      simple.mock(log, "external");
      watchdog.initializeCommunication();

      // Answer pings with pongs
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
      }, 100);

    }, 1000));

  });
});
