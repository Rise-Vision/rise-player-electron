const commonMessaging = require("common-display-module/messaging");
const simpleMock = require("simple-mock");
const mock = simpleMock.mock;
const installer = require("../../main/player/installer.js");
const assert = require("assert");
let broadcastMessageMock = null;
describe("installer", ()=>{
  beforeEach("setup mocks", ()=>{
    broadcastMessageMock = mock(commonMessaging, "broadcastMessage");
  });

  afterEach("clean mocks", ()=>{
    simpleMock.restore();
  });

  it("should broadcastMessage when showFailedProxy is called", ()=>{
    installer.showFailedProxy("url");
    assert(broadcastMessageMock.lastCall.args[0], {from: "player", topic:"unable_to_connect_to_GCS", data: "url"});
  });

  it("should broadcastMessage when showInvalidDisplayId is called", ()=>{
    installer.showInvalidDisplayId();
    assert(broadcastMessageMock.lastCall.args[0], {from: "player", topic:"invalid_display"});
  });

  it("should broadcastMessage when showOffline is called", ()=>{
    installer.showOffline();
    assert(broadcastMessageMock.lastCall.args[0], {from: "player", topic:"offline"});
  });

  it("should broadcastMessage when playerLoadComplete is called", ()=>{
    installer.playerLoadComplete();
    assert(broadcastMessageMock.lastCall.args[0], {from: "player", topic:"player_load_complete"});
  });
});
