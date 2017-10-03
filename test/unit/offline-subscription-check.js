const checker = require("../../installer/offline-subscription-check.js");
const network = require("rise-common-electron").network;
const onlineDetection = require("../../installer/online-detection.js");
const config = require("../../installer/config.js");
const simple = require("simple-mock");
const assert = require("assert");
global.log = global.log || {debug(){},all(){},external(){}};

describe("Offline Subscription Check", ()=>{
  let jsonStub = simple.stub().resolveWith({authorized:true});

  beforeEach(()=>{
    simple.mock(network, "httpFetch").resolveWith({json: jsonStub});
    simple.mock(onlineDetection, "isOnline").returnWith(true);
    simple.mock(config, "writeFile").resolveWith(true);
    simple.mock(config, "deleteFile").resolveWith(true);
    simple.mock(config, "fileExists").returnWith(true);
    simple.mock(config, "getDisplaySettingsSync").returnWith({displayid: "testid"});
  });

  afterEach(()=>{
    simple.restore();
  });

  it("uses the config display id", ()=>{
    return checker.isSubscribed()
    .then(()=>{
      assert(network.httpFetch.called);
      assert(jsonStub.called);
      assert(network.httpFetch.firstCall.args[0].includes("testid"));
    });
  });

  it("create the file when remote respose is true", ()=>{
    return checker.isSubscribed()
    .then(()=>{
      assert.equal(config.writeFile.callCount, 1);
    });
  });

  it("delete the file when remote respose is false", ()=>{
    jsonStub = simple.stub().resolveWith({authorized:false});
    simple.mock(network, "httpFetch").resolveWith({json: jsonStub});

    return checker.isSubscribed()
      .then(()=>{
      assert.equal(config.deleteFile.callCount, 1);
    });
  });

  it("uses local saved response if offline", ()=>{
    simple.mock(onlineDetection, "isOnline").returnWith(false);
    simple.mock(config, "fileExists").resolveWith(false);

    return checker.isSubscribed()
    .then((status)=>{
      assert(!network.httpFetch.called);
      assert.equal(status, false);
    });
  });
});
