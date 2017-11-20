const moduleCommon = require("common-display-module");

module.exports = {
  showFailedProxy(host) {
    log.debug(`restarting installer to show failed ${host}`);
    moduleCommon.broadcastMessage({from: "player", topic:"unable_to_connect_to_GCS", data: host});

  },
  showInvalidDisplayId() {
    log.debug("restarting installer to show invalid display id");
    moduleCommon.broadcastMessage({from: "player", topic:"invalid_display"});
  },
  showOffline() {
    log.debug("restarting installer to show offline screen");
    moduleCommon.broadcastMessage({from: "player", topic:"offline"});
  },
  playerLoadComplete() {
    log.debug("Player load complete");
    moduleCommon.broadcastMessage({from: "player", topic:"player_load_complete"});
  }
};
