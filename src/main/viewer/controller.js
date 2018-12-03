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
const scheduleParser = require("../uptime/schedule-parser");
const messaging = require("../player/messaging");

const VIEWER_URL = "https://viewer.risevision.com/Viewer.html?";

let BrowserWindow;
let app;
let globalShortcut;
let ipc;
let viewerWindow;
let dataHandlerRegistered;
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

  globalShortcut.register("CommandOrControl+Shift+.", ()=>{
    if (window && window.isFocused()) {
      webContents.toggleDevTools();
    }
  });

  ipc.on("viewer-message", (evt, data)=>{
    if (data.message === "ping") {
      watchdog.send(data);
    } else if(data.message === "viewer-config") {
      const RETRIES = 10, RETRY_TIMEOUT = 10000, RETRY_DELAY = 30000;

      platform.runFunction(configLogger.logClientInfo.bind(null, data), RETRIES, RETRY_TIMEOUT, RETRY_DELAY)
        .catch((err)=>{
          const errorDetail = require("util").inspect(err, { depth: null });
          log.error(errorDetail, "logging client info");
        });
    } else if(data.message === "data-handler-registered") {
      if (dataHandlerRegistered && typeof dataHandlerRegistered === "function") {
        dataHandlerRegistered();
      }

      dataHandlerRegistered = true;
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
        dataHandlerRegistered = false;
        globalShortcut.unregister("CommandOrControl+Shift+.");
        module.exports.reload();

      }, 60000);
    }
  });

}

function createViewerUrl() {
  const displaySettings = commonConfig.getDisplaySettingsSync();
  const overrideUrl = displaySettings.viewerurl;
  const id = displaySettings.displayid || "";

  let url = overrideUrl || VIEWER_URL;

  if (!onlineDetection.isOnline()) {
    url = "file://" + __dirname + "/localviewer/main/Viewer.html?";
  }

  url = url.slice(-1) === "?" ? url : url+"?";

  return Promise.resolve(`${url}type=display&player=true&id=${id}`);
}

function createViewerWindow(overrideUrl) {
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
    "alwaysOnTop": false,
    "frame": false,
    "icon": path.join(app.getAppPath(), "installer", "ui", "img", "icon.png"),
    "webPreferences": {
      "preload": `${__dirname}/preload.js`,
      "plugins": true,
      "nodeIntegration": false,
      "webSecurity": false
    }
  }, customResolutionSettings));

  viewerWindow.loadURL("about:blank");

  viewerWindow.webContents.session.setCertificateVerifyProc((request, callback) => {
    const {hostname, certificate, verificationResult, errorCode} = request;
    if (hostname === "localhost" && certificate.issuer.organizations[0] === "Rise Vision") {
      callback(0);
    } else {
      let url = overrideUrl || VIEWER_URL;
      if (errorCode && errorCode !== 0 && url.indexOf(hostname) !== -1) {
        const redacted = Object.assign({}, certificate, {data: "", issuerCert: ""});
        log.external("viewer certificate error", `Hostname ${hostname} with result ${verificationResult} on certificate: ${JSON.stringify(redacted)}`);
      }
      callback(-3);
    }
  });

  if (customResolution) {
    viewerWindow.setSize(Number(displaySettings.screenwidth), Number(displaySettings.screenheight));
    electron.screen.on("display-added", (event, newDisplay) => {
      const bounds = {x: 0, y: 0, width: Number(displaySettings.screenwidth), height: Number(displaySettings.screenheight)};
      log.all("window bounds reset", `display added ${JSON.stringify(newDisplay)} window bounds ${JSON.stringify(viewerWindow.getBounds())}`);
      viewerWindow.setBounds(bounds);
    });
  }

  log.all("initial window bounds", `bounds: ${JSON.stringify(viewerWindow.getBounds())} displays: ${JSON.stringify(electron.screen.getAllDisplays())}`);

  registerEvents(viewerWindow);

  viewerWindow.webContents.on("login", (event, webContents, request, authInfo, cb)=>{
    if (proxy.configuration().username) {
      event.preventDefault();
      if (!cb) {cb = authInfo;}
      cb(proxy.configuration().username, proxy.configuration().password);
    }
  });

  if (proxy.configuration().hostname) {
    viewerWindow.webContents.session.setProxy({pacScript: proxy.pacScriptURL(), proxyBypassRules: "localhost"}, ()=>{});
    log.debug("using pac: " + proxy.pacScriptURL());
  }
}

function loadViewerUrl() {
  return createViewerUrl()
    .then(url => loadUrl(url))
    .then(()=>{
      return new Promise((res)=>{
        if (dataHandlerRegistered) {return res();}
        dataHandlerRegistered = res;
      });
    });
}

function loadUrl(url) {
  log.external("loading url", url);
  viewerWindow.loadURL(url);

  return new Promise((res)=>{
    let viewerTimeout = setTimeout(()=>{
      log.external("url load timeout", url);
      res(viewerWindow);
    }, 2.5 * 60 * 1000);

    viewerWindow.webContents.on("did-finish-load", ()=>{
      clearTimeout(viewerTimeout);
      res(viewerWindow);
    });
  });
}

function isViewerLoaded() {
  const loadedUrl = viewerWindow && viewerWindow.webContents && viewerWindow.webContents.getURL();
  return loadedUrl && loadedUrl.indexOf(VIEWER_URL) !== -1;
}

function loadContent(content) {
  if (scheduleParser.hasOnlyRiseStorageURLItems()) {
    dataHandlerRegistered = false;
    return loadUrl(scheduleParser.firstURL());
  }

  const viewerPromise = isViewerLoaded() ? Promise.resolve() : loadViewerUrl();
  return viewerPromise.then(() => viewerContentLoader.sendContentToViewer(content));
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
  launch(overrideUrl) {
    const noViewerUrl = scheduleParser.hasOnlyRiseStorageURLItems() ? scheduleParser.firstURL() : null;
    const urlToLoad = overrideUrl || noViewerUrl;
    createViewerWindow(urlToLoad);

    uptime.setRendererWindow(viewerWindow);

    let loadUrlPromise = Promise.resolve();
    if (urlToLoad) {
      dataHandlerRegistered = false;
      loadUrlPromise = loadUrl(urlToLoad);
    } else {
      loadUrlPromise = loadViewerUrl();
    }

    return loadUrlPromise.then(()=>{
      log.debug("viewer launch complete");
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
    .then((viewerWindow)=>{
      viewerWindowBindings.setWindow(viewerWindow);
    })
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
  }
};
