const network = require("rise-common-electron").network;
const childProcess = require("child_process");
const riseCacheWatchdog = require("../../main/player/rise-cache-watchdog.js");
const assert = require("assert");
const simpleMock = require("simple-mock");
const mock = simpleMock.mock;
const cacheOkResponse = {
  json() {
    return { name: "rise-cache-v2" };
  }
};

describe("Rise Cache Watchdog", ()=>{
  beforeEach(()=>{
    mock(riseCacheWatchdog, "getCheckInterval").returnWith(20);
    mock(childProcess, "fork").returnWith({
      on: simpleMock.stub(),
      send: simpleMock.stub()
    });
  });

  afterEach(()=>{
    simpleMock.restore();
    riseCacheWatchdog.stop();
  });

  it("starts Rise Cache", ()=>{
    riseCacheWatchdog.launchCache();

    assert.equal(childProcess.fork.called, true);
    assert.equal(childProcess.fork.lastCall.returned.on.called, true);
    assert.equal(childProcess.fork.lastCall.returned.on.lastCall.arg, "error");

  });

  it("periodically checks Rise Cache is still active", ()=>{
    mock(network, "httpFetch").resolveWith(cacheOkResponse);

    riseCacheWatchdog.startWatchdog();

    return new Promise((res)=>{
      setTimeout(()=>{
        assert.equal(network.httpFetch.callCount, 5);
        assert.equal(network.httpFetch.lastCall.args[0], "http://127.0.0.1:9494/");
        assert.equal(childProcess.fork.called, false);
        res();
      }, 120);
    });
  });

  it("restarts Rise Cache once if the validation fails", ()=>{
    mock(network, "httpFetch").rejectWith();

    riseCacheWatchdog.startWatchdog();

    return new Promise((res)=>{
      setTimeout(()=>{
        assert.equal(network.httpFetch.called, true);
        assert.equal(childProcess.fork.called, true);
        assert.equal(childProcess.fork.lastCall.returned.send.lastCall.arg, "quit");
        res();
      }, 120);
    });
  });
});
