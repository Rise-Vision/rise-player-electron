module.exports = {
  showFailedProxy(host) {
    log.debug(`restarting installer to show failed ${host}`);
  },
  showInvalidDisplayId() {
    log.debug("restarting installer to show invalid display id");
  },
  showOffline() {
    log.debug("restarting installer to show offline screen");
  }
};
