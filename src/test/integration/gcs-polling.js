global.log = global.log || {file() {}, external() {}, debug: console.log, error: {}};

const assert = require("assert");
const gcsPolling = require("../../main/player/gcs-polling.js");
const simple = require("simple-mock");
const platform = require("rise-common-electron").platform;
const config = require("../../main/player/config.js");

describe("GCS Polling", function() {
  this.timeout(5000);

  afterEach(()=>{
    simple.restore();
  });

  it("doesn't log error on 404 or 401 (both indicate not found on GCS)", ()=>{
    simple.mock(config, "getDisplaySettingsSync").returnWith({displayid: "test12345"});
    simple.mock(platform, "writeTextFile");
    simple.mock(log, "error").callFn((err)=>{console.log(err);});

    gcsPolling.init();

    return gcsPolling.refreshCommandsFileGeneration()
    .then(()=>{
      assert.equal(log.error.callCount, 0);
    });
  });
});
