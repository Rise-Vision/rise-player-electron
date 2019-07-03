const assert = require("assert");
const simple = require("simple-mock");
const contentUptime = require("../../../main/uptime/content-uptime.js");
const commonMessaging = require("common-display-module/messaging");
const messaging = require("../../../main/player/messaging.js");
const templateUptimeLogger = require("../../../main/loggers/template-uptime-logger");
const componentUptimeLogger = require("../../../main/loggers/component-uptime-logger");

describe.only("contentUptime", ()=>{
  beforeEach(()=>{
    simple.mock(global, "setInterval")
      .callbackAtIndex(0)
      .returnWith();
    simple.mock(global, "setTimeout").returnWith();
    simple.mock(global, "clearTimeout").returnWith();
    simple.mock(messaging, "onEvent");
    simple.mock(commonMessaging, "broadcastToLocalWS");
    simple.mock(templateUptimeLogger, "logTemplateUptime").returnWith();
    simple.mock(componentUptimeLogger, "logComponentUptime").returnWith();
  });

  afterEach(()=>{
    contentUptime.handlePlayingItem();

    simple.restore();
  });

  it("exists", ()=>assert(!!contentUptime));

  describe("init", ()=>{
    it("registers listeners", ()=>{
      contentUptime.init();

      var call1 = messaging.onEvent.calls[0];
      assert.equal(call1.args[0], "content-uptime-result");

      var call2 = messaging.onEvent.calls[1];
      assert.equal(call2.args[0], "playing-item");
    });

    it("starts timer", ()=>{
      contentUptime.init();

      assert.equal(setInterval.firstCall.args[0].name, "retrieveUptime");
    });
  });

  describe("handlePlayingItem", ()=>{
    it("exists", ()=>assert(!!contentUptime.handlePlayingItem));
  });

  describe("retrieveUptime", ()=>{
    it("does not broadcast uptime message if no item is playing", ()=>{
      contentUptime.init();

      assert(!commonMessaging.broadcastToLocalWS.called);
    });

    it("does not broadcast uptime message if a presentation item is playing", ()=>{
      contentUptime.handlePlayingItem({
        presentationType: "Presentation"
      });
      contentUptime.init();

      assert(!commonMessaging.broadcastToLocalWS.called);
    });

    it("broadcasts uptime message", ()=>{
      contentUptime.handlePlayingItem({
        presentationType: "HTML Template"
      });
      contentUptime.init();

      assert(commonMessaging.broadcastToLocalWS.called);
    });

    it("enqueues no response handler", ()=>{
      contentUptime.handlePlayingItem({
        presentationType: "HTML Template"
      });
      contentUptime.init();

      assert.equal(setTimeout.firstCall.args[0].name, "handleNoResponse");
    });
  });

  describe("handlePlayingItemFromViewer", ()=>{
    var handlePlayingItemFromViewer;
    beforeEach(()=>{
      contentUptime.init();

      var call2 = messaging.onEvent.calls[1];
      assert.equal(call2.args[1].name, "handlePlayingItemFromViewer");

      handlePlayingItemFromViewer = call2.args[1];
    });

    it("does not handle invalid responses", ()=>{
      handlePlayingItemFromViewer();
      setInterval.calls[0].args[0]();

      assert(!commonMessaging.broadcastToLocalWS.called);
    });

    it("update playlistItem on valid response", ()=>{
      handlePlayingItemFromViewer({
        item: {
          presentationType: "HTML Template"
        }
      });
      setInterval.calls[0].args[0]();

      assert(commonMessaging.broadcastToLocalWS.called);
    });
  });

  describe("handleUptimeResponse", ()=>{
    var handleUptimeResponse;
    function getHandleUptimeResponse(){
      contentUptime.init();

      var call1 = messaging.onEvent.calls[0];
      assert.equal(call1.args[1].name, "handleUptimeResponse");

      handleUptimeResponse = call1.args[1];
    }

    it("does not handle invalid responses", ()=>{
      contentUptime.handlePlayingItem({
        presentationType: "HTML Template",
        presentationId: "id"
      });

      getHandleUptimeResponse();

      handleUptimeResponse({});
      handleUptimeResponse({
        template: {
          presentation_id: "otherid"
        }
      });
      handleUptimeResponse({
        components: []
      });

      assert(!templateUptimeLogger.logTemplateUptime.called);
    });

    it("does not handle responses with different presentation id", ()=>{
      contentUptime.handlePlayingItem({
        presentationType: "HTML Template",
        presentationId: "id"
      });

      getHandleUptimeResponse();

      handleUptimeResponse({
        template: {
          presentation_id: "otherid"
        },
        components: []
      });

      assert(!templateUptimeLogger.logTemplateUptime.called);
    });

    it("handles valid responses", ()=>{
      contentUptime.handlePlayingItem({
        presentationType: "HTML Template",
        presentationId: "id"
      });

      getHandleUptimeResponse();

      handleUptimeResponse({
        template: {
          presentation_id: "id"
        },
        components: []
      });

      assert(templateUptimeLogger.logTemplateUptime.called);
    });

    it("log component uptimes", ()=>{
      contentUptime.handlePlayingItem({
        presentationType: "HTML Template",
        presentationId: "id"
      });

      getHandleUptimeResponse();

      handleUptimeResponse({
        template: {
          presentation_id: "id"
        },
        components: [{
          id: "component1"
        }, {
          id: "component2"
        }]
      });

      assert.equal(componentUptimeLogger.logComponentUptime.callCount, 2);
    });

    it("clears timeout for no response", ()=>{
      contentUptime.handlePlayingItem({
        presentationType: "HTML Template",
        presentationId: "id"
      });

      getHandleUptimeResponse();

      handleUptimeResponse({
        template: {
          presentation_id: "id"
        },
        components: []
      });

      assert(clearTimeout.called);
    });
  });

  describe("handleNoResponse", ()=>{
    var handleNoResponse;
    function getHandleNoResponse(){
      contentUptime.init();

      var call1 = setTimeout.calls[0];
      assert.equal(call1.args[0].name, "handleNoResponse");

      handleNoResponse = call1.args[0];
    }

    it("handles no response from the template", ()=>{
      contentUptime.handlePlayingItem({
        presentationType: "HTML Template",
        presentationId: "id"
      });

      getHandleNoResponse();

      handleNoResponse();

      assert(templateUptimeLogger.logTemplateUptime.called);
    });

    it("does not handle if reponse already received", ()=>{
      contentUptime.handlePlayingItem({
        presentationType: "HTML Template",
        presentationId: "id"
      });

      getHandleNoResponse();

      var call1 = messaging.onEvent.calls[0];
      assert.equal(call1.args[1].name, "handleUptimeResponse");

      call1.args[1]({
        template: {
          presentation_id: "id"
        },
        components: []
      });

      assert(templateUptimeLogger.logTemplateUptime.called);

      handleNoResponse();

      assert.equal(templateUptimeLogger.logTemplateUptime.callCount, 1);
    });

    it("does not handle uptime response if no response was logged", ()=>{
      contentUptime.handlePlayingItem({
        presentationType: "HTML Template",
        presentationId: "id"
      });

      getHandleNoResponse();

      handleNoResponse();

      assert(templateUptimeLogger.logTemplateUptime.called);

      var call1 = messaging.onEvent.calls[0];
      assert.equal(call1.args[1].name, "handleUptimeResponse");

      call1.args[1]({
        template: {
          presentation_id: "id"
        },
        components: []
      });

      assert.equal(templateUptimeLogger.logTemplateUptime.callCount, 1);
    });

  });

});
