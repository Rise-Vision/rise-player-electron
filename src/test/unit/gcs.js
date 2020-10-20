const gcs = require("../../main/player/gcs.js");
const network= require("rise-common-electron").network;
const commonConfig = require("common-display-module");
const assert = require("assert");
const simpleMock = require("simple-mock");
const platform = require("rise-common-electron").platform;
const mock = simpleMock.mock;
const THROTTLED_MESSAGE = "gcs check throttled";

describe("GCS", ()=>{
  beforeEach(()=>{
    mock(log, "file").returnWith();
    mock(log, "external").callFn((...rest)=>console.log(...rest));
    mock(log, "debug").callFn((...rest)=>console.log(...rest));
    mock(network, "httpFetch").resolveWith({statusCode: 304});
  });

  afterEach(()=>{
    simpleMock.restore();
  });

  it("throttles when hitting limit for the hour", ()=>{
    const testPath = "/my-path";
    const testData = {
      [testPath]: {
        lastFetch: Date.now(),
        lastFetchCount: 9,
        content: "test-content"
      }
    };

    mock(commonConfig, "fileExists").returnWith(true);
    mock(platform, "readTextFile").returnWith(Promise.resolve(JSON.stringify(testData)));

    return gcs.getFileContents(testPath)
    .then(result=>assert.equal(result,testData[testPath].content))
    .then(()=>assert.equal(network.httpFetch.callCount, 0))
    .then(()=>assert(log.external.calls.some(call=>call.args[0] === THROTTLED_MESSAGE)));
  });

  it("doesn't throttle when no data is present for the path", ()=>{
    const testPath = "/my-path";
    const testData = {
      ["someOtherTestPath"]: {
        lastFetch: Date.now(),
        lastFetchCount: 9,
        content: "test-content"
      }
    };

    mock(commonConfig, "fileExists").returnWith(true);
    mock(platform, "readTextFile").returnWith(Promise.resolve(JSON.stringify(testData)));

    return gcs.getFileContents(testPath)
    .then(()=>assert.equal(network.httpFetch.callCount, 1))
    .then(()=>assert(log.external.calls.every(call=>call.args[0] !== THROTTLED_MESSAGE)));
  });

  it("doesn't throttle when no last fetch count is present for the path", ()=>{
    const testPath = "/my-path";
    const testData = {
      [testPath]: {
        lastFetch: Date.now(),
        content: "test-content"
      }
    };

    mock(commonConfig, "fileExists").returnWith(true);
    mock(platform, "readTextFile").returnWith(Promise.resolve(JSON.stringify(testData)));

    return gcs.getFileContents(testPath)
    .then(()=>assert.equal(network.httpFetch.callCount, 1))
    .then(()=>assert(log.external.calls.every(call=>call.args[0] !== THROTTLED_MESSAGE)));
  });
});
