const assert = require("assert");
const ipc = require('node-ipc');
const installer = require("../../main/player/installer.js");
let expectation = {};
let scenarioDone = null;

describe("Installer", ()=>{
  describe("broadcast Messages", ()=>{
    before((done)=>{
      ipc.config.id   = "lms";
      ipc.config.retry= 1500;

      ipc.serve( () => {
        done();
        ipc.server.on( "message", (message) => {
          assert.deepEqual(message, expectation);
          scenarioDone();
        });
        ipc.server.on("socket.disconnected", (socket, destroyedSocketID) => {
          ipc.log(`client ${destroyedSocketID} has disconnected!`);
        });
      });

      ipc.server.start();
    });

    after(()=>{
      ipc.server.stop();
    });

    it("should send the failed proxy message", (done)=>{
      installer.showFailedProxy("testURL");
      expectation = {from: "player", topic:"unable_to_connect_to_GCS", data:"testURL"};
      scenarioDone = done;
    });

    it("should send the invalid display message", (done)=>{
      installer.showInvalidDisplayId();
      expectation = {from: "player", topic:"invalid_display"};
      scenarioDone = done;
    });

    it("should send the offline message", (done)=>{
      installer.showOffline();
      expectation = {from: "player", topic:"offline"};
      scenarioDone = done;
    });

    it("should send the quit message", (done)=>{
      installer.playerLoadComplete();
      expectation = {from: "player", topic:"player_load_complete"};
      scenarioDone = done;
    });
  });
});
