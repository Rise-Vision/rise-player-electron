const moduleCommon = require("common-display-module");

function broadcastMessage(message) {
  moduleCommon.connect("player").then((lmsClient)=>{
    lmsClient.broadcastMessage(message);
  });
}

module.exports = {
  showFailedProxy(host) {
    let message = {};
    log.debug(`restarting installer to show failed ${host}`);
    message.from = "player";
    message.topic = "unable_to_connect_to_GCS";
    message.data = host;
    broadcastMessage(message);
  },
  showInvalidDisplayId() {
    let message = {};
    log.debug("restarting installer to show invalid display id");
    message.from = "player";
    message.topic = "invalid_display";
    broadcastMessage(message);
  },
  showOffline() {
    let message = {};
    log.debug("restarting installer to show offline screen");
    message.from = "player";
    message.topic = "offline";
    broadcastMessage(message);
  },
  quit() {
    let message = {};
    log.debug("Quitting intaller");
    message.from = "player";
    message.topic = "quit";
    broadcastMessage(message);
  }
};
