const assert = require("assert");
const config = requireRoot("installer/config.js");
const onlineDetection = requireRoot("installer/online-detection.js");
const {network} = require("rise-common-electron");
const checker = requireRoot("installer/offline-subscription-check.js");
const simple = require("simple-mock");
const version = requireRoot("version.json");

describe("Offline Subscription Check", function() {
  this.timeout(3000);

  before(()=>{console.log("version: " + version);});

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
      config.deleteFile(checker.fileFlag(), version, res);
    });

    return deleteFilePromise
    .then(checker.isSubscribed)
    .then((result)=>{
      assert(result);
      assert(config.fileExists(checker.fileFlag(), version));
    });
  });

  it("uses the file flag to indicate status when offline", ()=>{
    simple.mock(log, "all").callFn(console.log);
    simple.mock(onlineDetection, "isOnline").returnWith(false);

    config.writeFile(checker.fileFlag(), "", version);

    return checker.isSubscribed();
  });
});
