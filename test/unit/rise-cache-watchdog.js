const network = require("rise-common-electron").network;
const childProcess = require("child_process");
const riseCacheWatchdog = require("../../player/rise-cache-watchdog.js");
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
      unref: simpleMock.stub(),
      disconnect: simpleMock.stub()
    });
  });

  afterEach(()=>{
    simpleMock.restore();
  });

  xit("starts Rise Cache", ()=>{
    riseCacheWatchdog.launchCache();

    assert(childProcess.fork.called);
    assert(childProcess.fork.lastCall.returned.unref.called);
    assert(childProcess.fork.lastCall.returned.disconnect.called);
  });

  xit("periodically checks Rise Cache is still active", ()=>{
    mock(network, "httpFetch").resolveWith(cacheOkResponse);

    riseCacheWatchdog.startWatchdog();

    return new Promise((res)=>{
      setTimeout(()=>{
        assert.equal(network.httpFetch.callCount, 5);
        assert.equal(network.httpFetch.lastCall.args[0], "http://localhost:9494/");
        assert(!childProcess.fork.called);
        res();
      }, 110);
    });
  });

  xit("restarts Rise Cache once if the validation fails", ()=>{
    mock(network, "httpFetch").rejectWith();

    riseCacheWatchdog.startWatchdog();

    return new Promise((res)=>{
      setTimeout(()=>{
        assert(network.httpFetch.called);
        assert(childProcess.fork.called);
        res();
      }, 110);
    });
  });
});
