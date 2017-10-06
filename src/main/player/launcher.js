const messaging = require("./messaging.js"),
screenshot = require("./screenshot.js"),
dupeId = require("./duplicate-id.js"),
restart = require("./restart.js"),
reboot = require("./reboot.js"),
scheduledReboot= require("./scheduled-reboot.js"),
platform = require("rise-common-electron").platform,
installer = require("./installer.js"),
watchdog = require("./watchdog.js"),
riseCacheWatchdog = require("../player/rise-cache-watchdog.js"),
gcsPolling = require("./gcs-polling.js"),
gcs = require("./gcs.js"),
viewerWindowBindings = require("../viewer/window-bindings.js"),
viewer = require("../viewer"),
onlineDetection = require("./online-detection.js"),
offlineSubscriptionCheck = require("./offline-subscription-check.js"),
viewerContentLoader = require("../viewer/content-loader.js");

module.exports = {
  launch(uiController) {
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
      uiController.showOffline();
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
          log.debug("SHOWING INvALID DISPLAY");
          installer.showInvalidDisplayId();
        }
        return Promise.reject(Error("no content"));
      }
      viewerContentLoader.sendContentToViewer(content);
      scheduledReboot.scheduleRebootFromViewerContents(content);
    })
    .then(gcsPolling.init);
  }
};
