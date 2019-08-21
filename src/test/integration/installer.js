const assert = require("assert");
const ipc = require('node-ipc');
const commonMessaging = require("common-display-module/messaging");
const installer = require("../../main/player/installer.js");

let expectation = {};
let scenarioDone = () => {};

describe("Installer", ()=>{
  describe("broadcast Messages", ()=>{
    before((done)=>{
      ipc.config.id = "lms";
      ipc.config.retry= 1500;

      ipc.serve(() => {
        ipc.server.on( "message", (message) => {
          assert.deepEqual(message, expectation);
          scenarioDone();
        });

        ipc.server.on("socket.disconnected", (socket, destroyedSocketID) => {
          ipc.log(`client ${destroyedSocketID} has disconnected!`);
        });

        done();
      });

      ipc.server.start();
    });

    after(()=>{
      ipc.server.stop();
      commonMessaging.disconnect();
    });

    it("should send the failed proxy message", (done)=>{
      expectation = {from: "player", topic:"unable_to_connect_to_GCS", data:"testURL"};
      scenarioDone = done;
      installer.showFailedProxy("testURL");
    });

    it("should send the invalid display message", (done)=>{
      expectation = {from: "player", topic:"invalid_display"};
      scenarioDone = done;
      installer.showInvalidDisplayId();
    });

    it("should send the offline message", (done)=>{
      expectation = {from: "player", topic:"offline"};
      scenarioDone = done;
      installer.showOffline();
    });

    it("should send the quit message", (done)=>{
      expectation = {from: "player", topic:"player_load_complete"};
      scenarioDone = done;

      installer.playerLoadComplete();
    });
  });
});
