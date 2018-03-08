const config = require("./config");
const messaging = require("./messaging.js");
const screenshot = require("./screenshot.js");
const dupeId = require("./duplicate-id.js");
const restart = require("./restart.js");
const reboot = require("./reboot.js");
const scheduledReboot= require("./scheduled-reboot.js");
const platform = require("rise-common-electron").platform;
const installer = require("./installer.js");
const watchdog = require("./watchdog.js");
const riseCacheWatchdog = require("../player/rise-cache-watchdog.js");
const gcsPolling = require("./gcs-polling.js");
const gcs = require("./gcs.js");
const viewerWindowBindings = require("../viewer/window-bindings.js");
const viewer = require("../viewer");
const onlineDetection = require("./online-detection.js");
const offlineSubscriptionCheck = require("./offline-subscription-check.js");
const viewerContentLoader = require("../viewer/content-loader.js");
const heartbeat = require("common-display-module/heartbeat");

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
      log.all("launching viewer", "", 80);
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
      return gcs.getFileContents(viewerContentLoader.contentPath())
      .catch((err)=>{
        log.external("could not retrieve initial content", require("util").inspect(err));
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
      viewerContentLoader.sendContentToViewer(content);
      scheduledReboot.scheduleRebootFromViewerContents(content);
      installer.playerLoadComplete();
    })
    .then(gcsPolling.init)
    .then(() => heartbeat.startHeartbeatInterval(config.moduleName));
  }
};
