const assert = require("assert");
const config = require("../../main/player/config.js");
const onlineDetection = require("../../main/player/online-detection.js");
const commonConfig = require("common-display-module");
const {network} = require("rise-common-electron");
const checker = require("../../main/player/offline-subscription-check.js");
const simple = require("simple-mock");

describe("Offline Subscription Check", function() {
  this.timeout(3000);

  afterEach(function() {
    simple.restore();
  });

  it("saves the offline subscription flag file after remote subscription confirmation", ()=>{
    simple.mock(log, "all").callFn(console.log);
    simple.mock(onlineDetection, "isOnline").returnWith(true);
    simple.mock(config, "getDisplaySettingsSync").returnWith({displayid:"testid"});
    simple.mock(network, "httpFetch").resolveWith({
      json() {
        return {
          authorized: true
        };
      }
    });

    let deleteFilePromise = new Promise((res)=>{
      commonConfig.deleteFile(checker.fileFlag(), null, res);
    });

    return deleteFilePromise
    .then(checker.isSubscribed)
    .then((result)=>{
      assert(result);
      assert(commonConfig.fileExists(checker.fileFlag()));
    });
  });

  it("uses the file flag to indicate status when offline", ()=>{
    simple.mock(log, "all").callFn(console.log);
    simple.mock(onlineDetection, "isOnline").returnWith(false);

    commonConfig.writeFile(checker.fileFlag(), "");

    return checker.isSubscribed();
  });
});
