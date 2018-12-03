const config = require("./config");
const messaging = require("./messaging");
const screenshot = require("./screenshot");
const dupeId = require("./duplicate-id");
const restart = require("./restart");
const reboot = require("./reboot");
const platform = require("rise-common-electron").platform;
const installer = require("./installer");
const watchdog = require("./watchdog");
const riseCacheWatchdog = require("../player/rise-cache-watchdog");
const gcsPolling = require("./gcs-polling");
const gcs = require("./gcs");
const viewerWindowBindings = require("../viewer/window-bindings");
const viewer = require("../viewer");
const onlineDetection = require("./online-detection");
const offlineSubscriptionCheck = require("./offline-subscription-check");
const viewerContentLoader = require("../viewer/content-loader");
const heartbeat = require("common-display-module/heartbeat");
const uncaughtExceptions = require("./uncaught-exceptions");
const scheduleParser = require("../uptime/schedule-parser");

module.exports = {
  launch() {
    log.all("messaging init", "", 5);
    dupeId.attachMessagingHandlers();
    messaging.init();

    return platform.killJava()
    .catch((err)=>{
      log.external("error killing java", require("util").inspect(err));
    })
    .then(()=>{
      return platform.waitForMillis(2000);
    })
    .then(()=>{
      log.all("cache start", "", 33);
      riseCacheWatchdog.launchCache();
      riseCacheWatchdog.startWatchdog();
    })
    .then(()=>{
      return platform.waitForMillis(1000);
    })
    .then(()=>{
      log.all("starting watchdog", "", 100);
      return watchdog.init();
    })
    .then(()=>{
      const offlineSubscribedPromise = offlineSubscriptionCheck.isSubscribed();

      if (!onlineDetection.isOnline() ) {
        log.external("not online");
        return offlineSubscribedPromise;
      }

      return true;
    })
    .then((loadViewer)=>{
      if (loadViewer) {return Promise.resolve();}

      log.all("offline notice", "", 100);
      installer.showOffline();
      restart.startCountdown();
      return Promise.reject("not online");
    })
    .then(()=>{
      return gcs.getFileContents(viewerContentLoader.contentPath())
      .catch((err)=>{
        log.external("could not retrieve initial content", require("util").inspect(err));
      });
    })
    .then(content=>{
      log.all("launching viewer", "", 80);
      scheduleParser.setContent(content);
      return viewer.launch();
    })
    .then((viewerWindow)=>{
      viewerWindowBindings.setWindow(viewerWindow);

      log.debug("starting screenshot listener", "", 100);
      screenshot.startListener();

      log.debug("setting up restart and reboot listeners");
      restart.startListener();
      reboot.startListener();
    })
    .then(()=>{
      return gcs.getCachedFileContents(viewerContentLoader.contentPath())
      .catch((err)=>{
        log.external("could not retrieve initial content from cache", require("util").inspect(err));
      });
    })
    .then((content)=>{
      if (!content || !content.display) {
        log.all("no viewer content");
        if (gcs.hasNetworkFailure()) {
          log.debug("SHOWING FAILED PROXY");
          installer.showFailedProxy(gcs.apiEndpointHost());
        } else {
          log.debug("SHOWING INVALID DISPLAY");
          installer.showInvalidDisplayId();
        }
        return Promise.reject(Error("no content"));
      }
      viewerContentLoader.setUpContent(content);
      viewerContentLoader.sendContentToViewer(content);
      installer.playerLoadComplete();
    })
    .then(gcsPolling.init)
    .then(() => heartbeat.startHeartbeatInterval(config.moduleName))
    .then(uncaughtExceptions.sendToBQ);
  }
};
