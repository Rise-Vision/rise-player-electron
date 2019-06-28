const assert = require("assert");
const simple = require("simple-mock");
const viewerWindowBindings = require("../../../main/viewer/window-bindings.js");
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

    it("rewrites HTTPS offline content when offline", ()=>{
      simple.mock(onlineDetection, "isOnline").returnWith(false);
      let testContent = {
        content: {
          presentations: [
            {
              layout: "abcd"
            },
            {
              layout: "XXXXhttps://s3.amazonaws.com/widget-image/0.1.1/dist/widget.htmlXXXX"
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
              layout: "XXXXhttps://widgets.risevision.com/widget-web-page/1.0.0/dist/widget.htmlXXXX"
            }
          ]
        }
      };
      contentLoader.sendContentToViewer(testContent);
      assert.deepEqual(viewerWindowBindings.sendToViewer.lastCall.args[0].newContent, expected);
    });

    it("converts HTML Template presentations to URL Items", ()=>{
      simple.mock(onlineDetection, "isOnline").returnWith(true);
      simple.mock(commonConfig, "isBetaLauncher").returnWith(false);
      const testObjRef = "test-obj-ref";
      const testPCode = "test-p-code";
      const computedTemplateURL = `https://widgets.risevision.com/stable/templates/${testPCode}/src/template.html?presentationId=${testObjRef}`;

      let testContent = {
        content: {
          schedule: {
            items: [
              {
                "type":"presentation",
                "presentationType":"HTML Template",
                "objectReference": testObjRef
              },
              {
                "type":"presentation",
                "presentationType":"NOT HTML Template",
                "objectReference":"other-obj-ref",
              }
            ]
          },
          presentations: [
            {
              "id": testObjRef,
              "productCode": testPCode
            },
            {
              "id": "other-obj-ref",
              "productCode": "other-p-code"
            },
          ]
        }
      };
      let expected = {
        content: {
          "presentations": [
            {
              "id": "test-obj-ref",
              "productCode": "test-p-code"
            },
            {
              "id": "other-obj-ref",
              "productCode": "other-p-code"
            }
          ],
          schedule: {
            items: [
              {
                "type":"url",
                "presentationType": "HTML Template",
                "objectReference": computedTemplateURL,
                "presentationId": "test-obj-ref",
                "productCode": "test-p-code",
                "version": "stable"

              },
              {
                "type": "presentation",
                "presentationType": "NOT HTML Template",
                "objectReference": "other-obj-ref",
              }
            ]
          }
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
