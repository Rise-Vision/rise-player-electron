const path = require("path");
const platform = require("rise-common-electron").platform;
const proxy = require("rise-common-electron").proxy;
const commonConfig = require("common-display-module");
const configLogger = require("../loggers/config-logger");
const widgetLogger = require("../loggers/widget-logger");
const watchdog = require("../player/watchdog.js");
const onlineDetection = require("../player/online-detection");
const viewerContentLoader = require("./content-loader");
const viewerLogger = require("./ext-logger.js");
const viewerWindowBindings = require("./window-bindings");
const gcs = require("../player/gcs.js");
const uptime = require('../uptime/uptime');
const contentUptime = require('../uptime/content-uptime');
const scheduleParser = require("../scheduling/schedule-parser");
const noViewerSchedulePlayer = require("../scheduling/schedule-player");
const messaging = require("../player/messaging");

const VIEWER_URL = "https://viewer-test.risevision.com/Viewer.html?";

let BrowserWindow;
let app;
let globalShortcut;
let ipc;
let viewerWindow;
let reloadTimeout;
let electron;

function registerEvents(window) {
  const webContents = window.webContents;

  window.on('unresponsive', ()=> {
    log.external('viewer window unresponsive');
    module.exports.launch();
    window.destroy();
  });

  window.on('closed', ()=> {
    log.debug('viewer window closed');
    window = null;
  });

  webContents.on('crashed', ()=> {
    log.external('viewer webContents crashed');
    window.destroy();
  });

  webContents.on('destroyed', ()=> log.all('viewer webContents destroyed'));

  webContents.on("did-fail-load", (evt, errorCode, errorDescription, validatedURL, isMainFrame)=>{
    log.external("error loading url", JSON.stringify({url: validatedURL, errorCode, errorDescription, isMainFrame}));
  });

  globalShortcut.register("CommandOrControl+Shift+.", ()=>{
    if (window && window.isFocused()) {
      webContents.toggleDevTools();
    }
  });

  ipc.on("viewer-message", (evt, data)=>{
    if (data.message === "ping") {
      watchdog.send(data);
    } else if(data.message === "viewer-config") {
      logClientInfo(data);
    } else if (data.message === "widget-ready") {
      viewerContentLoader.incrementReady(data.widgetUrl);
    } else if (data.message === "widget-log") {
      widgetLogger.log(data);
    } else if (data.message === "viewer-log") {
      viewerLogger.log(data);
    }
  });

  ipc.on("online-status-changed", (evt, status) => {
    if (status === "online" && viewerWindowBindings.offlineOrOnline() === "offline") {
      clearTimeout(reloadTimeout);

      reloadTimeout = setTimeout(()=>{
        log.all("switching from offline to online viewer");

        window.destroy();
        globalShortcut.unregister("CommandOrControl+Shift+.");
        module.exports.reload();

      }, 60000);
    }
  });

  ipc.on("player-configuration-called", () => log.file("player configuration function called"));
}

function logClientInfo(data) {
  if (!data && !viewerWindow) {
    log.error("empty data and viewer window", "error logging client info");
    return;
  }

  if (!data) {
    const [width, height] = viewerWindow.getContentSize();
    data = {width, height};
  }

  const RETRIES = 10, RETRY_TIMEOUT = 10000, RETRY_DELAY = 30000;

  return platform.runFunction(configLogger.logClientInfo.bind(null, data), RETRIES, RETRY_TIMEOUT, RETRY_DELAY)
    .catch((err)=>{
      const errorDetail = require("util").inspect(err, { depth: null });
      log.error(errorDetail, "logging client info");
    });
}

function createViewerUrl() {
  const displaySettings = commonConfig.getDisplaySettingsSync();
  const overrideUrl = displaySettings.debugviewerurl;
  const id = displaySettings.displayid || "";

  let url = overrideUrl || VIEWER_URL;

  // if (!onlineDetection.isOnline()) {
  //   url = "file://" + __dirname + "/localviewer/main/Viewer.html?";
  // }

  url = url.slice(-1) === "?" ? url : url+"?";

  return Promise.resolve(`${url}type=display&player=true&id=${id}`);
}

function createViewerWindow(initialPage = "about:blank") {
  const displaySettings = commonConfig.getDisplaySettingsSync();
  const customResolution = !isNaN(displaySettings.screenwidth) && !isNaN(displaySettings.screenheight);
  const customResolutionSettings = !customResolution ? {} : {
    x: 0,
    y: 0,
    enableLargerThanScreen: true
  };

  viewerWindow = new BrowserWindow(Object.assign({
    "center": !customResolution,
    "fullscreen": !customResolution,
    "alwaysOnTop": true,
    "frame": false,
    "icon": path.join(app.getAppPath(), "installer", "ui", "img", "icon.png"),
    "webPreferences": {
      "preload": `${__dirname}/preload/index.js`,
      "plugins": true,
      "nodeIntegration": false,
      "webSecurity": false
    }
  }, customResolutionSettings));

  if (proxy.configuration().hostname) {
    viewerWindow.webContents.session.setProxy({pacScript: proxy.pacScriptURL(), proxyBypassRules: "localhost"}, ()=>{});
    log.debug("using pac: " + proxy.pacScriptURL());
  }

  viewerWindow.loadURL(initialPage);
  viewerWindowBindings.setWindow(viewerWindow);

  if (customResolution) {
    viewerWindow.setSize(Number(displaySettings.screenwidth), Number(displaySettings.screenheight));
    electron.screen.on("display-added", (event, newDisplay) => {
      const bounds = {x: 0, y: 0, width: Number(displaySettings.screenwidth), height: Number(displaySettings.screenheight)};
      log.all("window bounds reset", `display added ${JSON.stringify(newDisplay)} window bounds ${JSON.stringify(viewerWindow.getBounds())}`);
      viewerWindow.setBounds(bounds);
    });
  }

  log.all("initial window bounds", `bounds: ${JSON.stringify(viewerWindow.getBounds())} displays: ${JSON.stringify(electron.screen.getAllDisplays())}`);

  electron.screen.on("display-added", (event, display)=>{
    log.all("display added", JSON.stringify(display));
  });

  registerEvents(viewerWindow);

  viewerWindow.webContents.on("login", (event, webContents, request, authInfo, cb)=>{
    if (proxy.configuration().username) {
      event.preventDefault();
      if (!cb) {cb = authInfo;}
      cb(proxy.configuration().username, proxy.configuration().password);
    }
  });

  return viewerWindow;
}

function setCertificateHandling(url = VIEWER_URL) {
  if (!viewerWindow) {return;}
  viewerWindow.webContents.session.setCertificateVerifyProc((request, callback) => {
    const {hostname, certificate, verificationResult, errorCode} = request;
    if (hostname === "localhost" && certificate.issuer.organizations[0] === "Rise Vision") {
      callback(0);
    } else {
      if (errorCode && errorCode !== 0 && url.indexOf(hostname) !== -1) {
        const redacted = Object.assign({}, certificate, {data: "", issuerCert: ""});
        log.external("viewer certificate error", `Hostname ${hostname} with result ${verificationResult} on certificate: ${JSON.stringify(redacted)}`);
      }
      callback(-3);
    }
  });
}

function loadViewerUrl() {
  noViewerSchedulePlayer.stop();

  let viewerMessagingReady = () => {};
  const viewerMessagingPromise = new Promise(res => viewerMessagingReady = res);

  let viewerTimeout = setTimeout(()=>{
    log.external("data handler registered timeout");
    viewerMessagingReady(viewerWindow);
  }, 2.5 * 60 * 1000);

  ipc.on('viewer-message', (evt, data) => {
    if(data.message === "data-handler-registered") {
      clearTimeout(viewerTimeout);
      viewerMessagingReady();
    }
  });

  return createViewerUrl()
  .then(url=>{

    loadUrl(url);

    return viewerMessagingPromise;
  });
}

function loadUrl(url) {
  if (!viewerWindow) {return;}
  log.external("loading url", url);

  setCertificateHandling(url);
  viewerWindow.loadURL(url);

  let viewerTimeout = setTimeout(()=>{
    log.external("url load timeout", url);
  }, 2.5 * 60 * 1000);

  viewerWindow.webContents.once("did-finish-load", ()=>clearTimeout(viewerTimeout));
}

function isViewerLoaded() {
  const loadedUrl = viewerWindow && viewerWindow.webContents && viewerWindow.webContents.getURL();
  return loadedUrl && loadedUrl.indexOf(VIEWER_URL) !== -1;
}

function loadContent(content) {
  if (scheduleParser.hasOnlyNoViewerURLItems()) {
    logClientInfo();
    viewerWindowBindings.sendToRenderer("begin-substituting-viewer-pings-to-watchdog");
    return Promise.resolve(noViewerSchedulePlayer.start());
  }

  const viewerPromise = isViewerLoaded() ? Promise.resolve() : loadViewerUrl();
  return viewerPromise.then(() => {
    if (content) {
      viewerContentLoader.sendContentToViewer(content);
    }
  });
}

module.exports = {
  init(_BrowserWindow, _app, _globalShortcut, _ipc, _electron) {
    if (!_BrowserWindow) { throw new Error("Invalid BrowserWindow"); }
    if (!_app) { throw new Error("Invalid app"); }
    if (!_globalShortcut) { throw new Error("Invalid globalShortcut"); }
    if (!_ipc) { throw new Error("Invalid ipc"); }
    if (!_electron) { throw new Error("Invalid electron"); }
    BrowserWindow = _BrowserWindow;
    app = _app;
    globalShortcut = _globalShortcut;
    ipc = _ipc;
    electron = _electron;

    noViewerSchedulePlayer.setPlayUrlHandler(loadUrl);
    noViewerSchedulePlayer.listenForNothingPlaying(()=>{
      loadUrl(`file://${__dirname}/black-screen.html`);
    });
    noViewerSchedulePlayer.listenForPlayingItem(contentUptime.handlePlayingItem);

    messaging.on("content-update", ()=>{
      return gcs.getFileContents(viewerContentLoader.contentPath(), {useLocalData: true, useThrottle: false})
      .then(content => {
        viewerContentLoader.setUpContent(content);
        loadContent(content);
      })
      .catch((err)=>{
        log.external("could not retrieve viewer content", require("util").inspect(err));
      });
    });
  },
  launch() {
    createViewerWindow();

    uptime.setRendererWindow(viewerWindow);
    contentUptime.init();

    return loadContent().then(()=>{
      log.file("viewer launch complete");
      return viewerWindow;
    })
    .catch((err)=>{
      log.external("viewer launch error", err);
      return viewerWindow;
    });
  },
  reload() {
    return gcs.getFileContents(viewerContentLoader.contentPath())
    .catch((err)=>{
      log.external("could not retrieve initial content", require("util").inspect(err));
    })
    .then(scheduleParser.setContent)
    .then(module.exports.launch)
    .then(()=>{
      return gcs.getCachedFileContents(viewerContentLoader.contentPath())
      .catch((err)=>{
        log.external("could not retrieve initial content", require("util").inspect(err));
      });
    })
    .then((content)=>{
      if (!content || !content.display) {
        log.all("no viewer content");
        return;
      }
      viewerContentLoader.setUpContent(content);
      viewerContentLoader.sendContentToViewer(content);
    });
  },
  showDuplicateIdError() {
    let htmlPath = path.join(app.getAppPath(), "/dupe-id.html?" + commonConfig.getDisplaySettingsSync().displayid);
    viewerWindow.loadURL("file://" + htmlPath);
  },
  createViewerWindow,
  loadUrl
};
