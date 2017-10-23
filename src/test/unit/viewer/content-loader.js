const assert = require("assert");
const simple = require("simple-mock");
const viewerWindowBindings = require("../../../main/viewer/window-bindings.js");
const gcs = require("../../../main/player/gcs.js");
const contentLoader = require("../../../main/viewer/content-loader.js");
const commonConfig = require("common-display-module");
const onlineDetection = require("../../../main/player/online-detection.js");
const messaging = require("../../../main/player/messaging.js");
global.log = global.log || require("rise-common-electron").logger();

describe("Viewer Content Loader", ()=>{
  beforeEach(()=>{
    simple.mock(commonConfig, "getDisplaySettingsSync").returnWith({displayid: "contentLoaderUT"});
    simple.mock(messaging, "on").returnWith();
    contentLoader.init();
  });

  afterEach(()=>{
    simple.restore();
  });

  it("exists", ()=>assert(!!contentLoader));

  describe("init", ()=>{
    it("registers content-update listener", ()=>{
      simple.mock(messaging, "on");
      contentLoader.init();
      var call = messaging.on.calls[0];
      assert.equal(call.args[0], "content-update");
    });
  });

  describe("sendContentToViewer" ,()=>{
    beforeEach(()=>{
      simple.mock(viewerWindowBindings, "sendToViewer");
      simple.mock(log, "external");
      simple.mock(log, "debug");
    });

    it("sends content to viewer when found", ()=>{
      simple.mock(gcs, "getFileContents").resolveWith({"test-content": "test-content"});
      simple.mock(messaging, "on");
      contentLoader.init();

      return messaging.on.lastCall.args[1]().then(()=>{
        assert(gcs.getFileContents.called);
        assert(viewerWindowBindings.sendToViewer.lastCall.args[0].newContent["test-content"]);
        assert.equal(gcs.getFileContents.lastCall.args[1].useLocalData, true);
      });
    });

    it("does not send new content to viewer on error", ()=>{
      simple.mock(gcs, "getFileContents").rejectWith(404);
      simple.mock(messaging, "on");
      contentLoader.init();

      return messaging.on.lastCall.args[1]().catch(()=>{
        assert(gcs.getFileContents.called);
        assert(!viewerWindowBindings.sendToViewer.called);
      });
    });
  });

  describe("rewrites", ()=>{
    beforeEach(()=>{
      simple.mock(viewerWindowBindings, "sendToViewer");
    });

    afterEach(()=>{
      simple.restore();
    });

    it("rewrites offline content when offline", ()=>{
      simple.mock(onlineDetection, "isOnline").returnWith(false);
      let testContent = {
        content: {
          presentations: [
            {
              layout: "abcd"
            },
            {
              layout: "XXXXhttp://s3.amazonaws.com/widget-image/0.1.1/dist/widget.htmlXXXX"
            }
          ]
        }
      };
      let expected = {
        content: {
          presentations: [
            {
              layout: "abcd"
            },
            {
              layout: "XXXX../widgets/image/widget.htmlXXXX"
            }
          ]
        }
      };
      contentLoader.sendContentToViewer(testContent);
      assert.deepEqual(viewerWindowBindings.sendToViewer.lastCall.args[0].newContent, expected);
    });

    it("rewrites online content when online", ()=>{
      simple.mock(onlineDetection, "isOnline").returnWith(true);
      let testContent = {
        content: {
          presentations: [
            {
              layout: "abcd"
            },
            {
              layout: "XXXXhttp://s3.amazonaws.com/widget-web-page/1.0.0/dist/widget.htmlXXXX"
            }
          ]
        }
      };
      let expected = {
        content: {
          presentations: [
            {
              layout: "abcd"
            },
            {
              layout: "XXXXhttps://s3.amazonaws.com/widget-web-page/1.0.0/dist/widget.htmlXXXX"
            }
          ]
        }
      };
      contentLoader.sendContentToViewer(testContent);
      assert.deepEqual(viewerWindowBindings.sendToViewer.lastCall.args[0].newContent, expected);
    });
  });
  describe("expected count", ()=>{
    it("counts widgets for which a ready event will be expected", ()=>{
      let widget1 = "http://s3.amazonaws.com/widget-image/0.1.1/dist/widget.html";
      let widget2 = "http://s3.amazonaws.com/widget-video-rv/1.1.0/dist/widget.html";

      let testContent = {
        content: {
          presentations: [
            {
              layout: `abcd${widget1}ef${widget1}gh${widget2}i`
            },
            {
              layout: `abcd${widget2}ef${widget1}`
            },
            {
              layout: `abc`
            }
          ]
        }
      };

      contentLoader.sendContentToViewer(testContent);
      assert.equal(contentLoader.expectedReadyCount(), 5);
    });
  });
});
