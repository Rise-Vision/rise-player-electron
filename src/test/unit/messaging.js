const assert = require("assert");
const simple = require("simple-mock");
const commonMessaging = require("common-display-module/messaging");
const messaging = require("../../main/player/messaging");

describe("Messaging : Unit", ()=>{
  const receiver = {
    on(evt, handler) {
      console.log("Intercepting message handler");
      if (evt === "message") {receiver.simulateIncomingLM = handler;}
    }
  };

  before(()=>{
    simple.mock(commonMessaging, "sendToMessagingService").returnWith();
    simple.mock(commonMessaging, "receiveMessages").callFn(()=>{
      return Promise.resolve(receiver);
    });

    messaging.init();
  });

  after(()=>{
    simple.restore();
  });

  it("registers disconnection handler", ()=>{
    return new Promise(res=>{
      messaging.onEvent("ms-disconnected", res);
      receiver.simulateIncomingLM({topic: "ms-disconnected"});
    });
  });

  it("registers connection handler", ()=>{
    return new Promise(res=>{
      messaging.onEvent("ms-connected", res);
      receiver.simulateIncomingLM({topic: "ms-connected"});
    });
  });

  it("registers message handler", ()=>{
    return new Promise(res=>{
      messaging.on("screenshot-request", res);
      receiver.simulateIncomingLM({msg: "screenshot-request"});
    });
  });

  it("writes to MS through LM using commonMessaging", ()=>{
    messaging.write("test");
    assert.equal(commonMessaging.sendToMessagingService.lastCall.args[0], "test");
  });

  it("allows event handlers to be triggered directly", ()=>{
    return new Promise(res=>{
      messaging.on("restart-request", res);
      messaging.injectMessage({msg: "restart-request"});
    });
  });
});
