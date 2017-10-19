const moduleCommon = require("common-display-module");
const simpleMock = require("simple-mock");
const mock = simpleMock.mock;
const installer = require("../../main/player/installer.js");
const assert = require("assert");
let getLMSClientMock = null;
describe("installer", ()=>{
  beforeEach("setup mocks", ()=>{
    connectMock = mock(moduleCommon, "connect").resolveWith({
      broadcastMessage: mock()
    });
  });

  afterEach("clean mocks", ()=>{
    simpleMock.restore();
  });

  it("should broadcastMessage when showFailedProxy is called", ()=>{
    installer.showFailedProxy("url");
    assert(connectMock.called);
  });

  it("should broadcastMessage when showFailedProxy is called with player id", ()=>{
    installer.showFailedProxy("url");
    assert.equal(connectMock.lastCall.args[0], "player");
  });

  it("should broadcastMessage when showInvalidDisplayId is called", ()=>{
    installer.showInvalidDisplayId("url");
    assert(connectMock.called);
  });

  it("should broadcastMessage when showOffline is called", ()=>{
    installer.showOffline("url");
    assert(connectMock.called);
  });
});
