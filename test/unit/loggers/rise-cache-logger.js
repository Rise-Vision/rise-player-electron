const assert = require("assert"),
  fs = require("fs"),
  path = require("path"),
  simpleMock = require("simple-mock"),
  mock = simpleMock.mock,
  config = require("../../../player/config.js"),
  message = {
    event: "info",
    event_details: "test info",
    error_details: "",
    display_id: "abc123",
    cache_version: "1.6.4",
    os: "win32",
    file_name: "cdf42c077fe6037681ae3c003550c2c5",
    file_url: "http://test.com/image.jpg"
  };

let bqClient, riseCacheLogger;

describe("Rise Cache logger", ()=>{
  beforeEach(()=>{
    mock(config, "getInstallDir").returnWith("test_dir");
    mock(log, "file").returnWith();

    riseCacheLogger = require("../../../loggers/rise-cache-logger.js");
    bqClient = riseCacheLogger.getBQClient();
  });

  afterEach(()=>{
    simpleMock.restore();
  });

  it("successfully inserts rise cache event data", ()=>{
    mock(bqClient, "insert").resolveWith();

    return riseCacheLogger.log(message)
      .then(()=>{
        assert(bqClient.insert.called);
        assert.equal(bqClient.insert.lastCall.args[0], "events");
        assert.equal(bqClient.insert.lastCall.args[1].event, "info");
        assert(bqClient.insert.lastCall.args[1].hasOwnProperty("ts"));
      });
  });

  it("adds failed log entries on insert failure", ()=>{
    before(()=>{
      try {
        fs.unlinkSync(path.join(config.getInstallDir(), riseCacheLogger.failedFileName()));
      } catch(e){}
    });

    after(()=>{
      try {
        fs.unlinkSync(path.join(config.getInstallDir(), riseCacheLogger.failedFileName()));
      } catch(e){}
    });

    mock(bqClient, "insert").rejectWith();

    return riseCacheLogger.log(message)
      .then(()=>{
        assert.equal(Object.keys(riseCacheLogger.pendingEntries()).length, 1);
      });
  });

});
