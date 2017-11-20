const assert = require("assert");
const simple = require("simple-mock");
const Primus = require("primus");
const commonConfig = require("common-display-module");

let socketInstance, messaging;

function createSocketInstance() {
  return {
    end: simple.mock(),
    on: simple.mock(),
    write: simple.mock()
  };
}

function Socket(url) {
  socketInstance.url = url;
  return socketInstance;
}

describe("Messaging", ()=>{
  beforeEach(()=>{
    Object.keys(require.cache)
    .filter(key=>key.includes("player/messaging.js"))
    .forEach((el)=>{delete require.cache[el];});

    socketInstance = createSocketInstance();
    simple.mock(Primus, "createSocket").returnWith(Socket);
    messaging = require("../../main/player/messaging.js");
  });

  afterEach(()=>{
    simple.restore();
    messaging.disconnect();
  });

  describe("init", ()=>{
    it("connects", ()=>{
      messaging.init("TEST");
      assert(socketInstance.on.called);
    });

    it("closes existing connection", ()=>{
      messaging.init("TEST");
      messaging.init("TEST");
      assert(socketInstance.end.called);
    });

    it("registers error handler", ()=>{
      simple.mock(log, "external");
      messaging.init("TEST");
      let call = socketInstance.on.calls.filter((call)=> call.args[0] === "error")[0];
      assert(call);
      let handler = call.args[1];
      handler({stack: "test"});
      assert(log.external.called);
    });

    it("registers data handler", ()=>{
      messaging.init("TEST");
      let call = socketInstance.on.calls.filter((call)=> call.args[0] === "data")[0];
      assert(call);
      let handler = call.args[1];
      assert(handler);
    });

    it("uses default url", ()=>{
      simple.mock(commonConfig, "getDisplaySettingsSync").returnWith({displayid: "12345", messagingurl: "TEST"});
      messaging.init();
      assert(socketInstance.url.startsWith("TEST"));
    });
  });

  describe("handlers", ()=>{
    let messagingInternalDataHandler;

    beforeEach(()=>{
      messaging.init("TEST");
      let dataHandlerRegistration = socketInstance.on.calls.filter((call)=>call.args[0] === "data")[0];
      assert(dataHandlerRegistration);
      messagingInternalDataHandler = dataHandlerRegistration.args[1];
    });

    it("calls handlers", ()=>{
      let externalAttachingHandler = simple.mock();
      messaging.on("test-message", externalAttachingHandler);
      messagingInternalDataHandler({msg: "test-message", displayId: "12345"});
      assert(externalAttachingHandler.called);
    });
  });

  describe("write", ()=>{
    beforeEach(()=>{
      messaging.init("TEST");
    });

    it("calls socket.write", ()=>{
      messaging.write("test");
      assert(socketInstance.write.called);
      assert(socketInstance.write.calls[0].args[0] === "test");
    });
  });

  describe("disconnect", ()=>{
    it("ends the connection", ()=>{
      messaging.init("TEST");
      messaging.disconnect();
      assert(socketInstance.end.called);
    });
  });
});
