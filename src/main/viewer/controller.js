const path = require("path");
const platform = require("rise-common-electron").platform;
const proxy = require("rise-common-electron").proxy;
const commonConfig = require("common-display-module");
const configLogger = require("../loggers/config-logger");
const widgetLogger = require("../loggers/widget-logger");
const watchdog = require("../player/watchdog");
const offlineCheck = require("../player/offline-restart-check");
const subscriptionCheck = require("../player/offline-subscription-check");
const viewerContentLoader = require("./content-loader");
const viewerLogger = require("./ext-logger");
const viewerWindowBindings = require("./window-bindings");
const gcs = require("../player/gcs");
const scheduledReboot = require("../player/scheduled-reboot");
let BrowserWindow;
let app;
let globalShortcut;
let ipc;
let viewerWindow;
let dataHandlerRegistered;
let reloadTimeout;

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
          log.error("logging client info", err);
          log.file(require("util").inspect(err, { depth: null }));
        });
    } else if(data.message === "data-handler-registered") {
      offlineCheck.markViewerAsStarted();

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

  ipc.on( "online-status-changed", ( evt, status ) => {
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
  } );

}

function createPresentationUrl() {
  const displaySettings = commonConfig.getDisplaySettingsSync();
  const overrideUrl = displaySettings.viewerurl;
  const id = displaySettings.displayid || "";

  let url = overrideUrl || "https://rvashow2.appspot.com/Viewer.html?";

  if (offlineCheck.shouldBeConsideredOffline()) {
    url = "file://" + __dirname + "/localviewer/main/Viewer.html?";
  }

  url = url.slice(-1) === "?" ? url : url+"?";

  return Promise.resolve(`${url}type=display&player=true&id=${id}`);
}

function loadURL(viewerWindow, url) {
  log.debug(`Loading presentation at ${url}`);

  const dontUseCache =
    ! offlineCheck.shouldBeConsideredOffline() && subscriptionCheck.isSubscribedCached();

  const options = dontUseCache ? {extraHeaders: "pragma: no-cache\n"} : {};
log.all(`Loading: ${url} : ${JSON.stringify(options)}`);
  viewerWindow.webContents.loadURL(url, options);
}

module.exports = {
  init(_BrowserWindow, _app, _globalShortcut, _ipc) {
    if (!_BrowserWindow) { throw new Error("Invalid BrowserWindow"); }
    if (!_app) { throw new Error("Invalid app"); }
    if (!_globalShortcut) { throw new Error("Invalid globalShortcut"); }
    if (!_ipc) { throw new Error("Invalid ipc"); }
    BrowserWindow = _BrowserWindow;
    app = _app;
    globalShortcut = _globalShortcut;
    ipc = _ipc;
  },
  launch(overrideUrl) {
    let displaySettings = commonConfig.getDisplaySettingsSync();
    let customResolution = !isNaN(displaySettings.screenwidth) && !isNaN(displaySettings.screenheight);
    let customResolutionSettings = !customResolution ? {} : {
      x: 0,
      y: 0,
      enableLargerThanScreen: true
    };

    viewerWindow = new BrowserWindow(Object.assign({
      "center": !customResolution,
      "fullscreen": !customResolution,
      "frame": false,
      "icon": path.join(app.getAppPath(), "installer", "ui", "img", "icon.png"),
      "webPreferences": {
        "preload": __dirname + "/preload.js",
        "plugins": true,
        "nodeIntegration": false,
        "webSecurity": false
      }
    }, customResolutionSettings));

    viewerWindow.loadURL("about:blank");

    viewerWindow.webContents.session.setCertificateVerifyProc((request, callback) => {
      const {hostname, certificate} = request;
      if (hostname === "localhost" && certificate.issuer.organizations[0] === "Rise Vision") {
        callback(0);
      } else {
        callback(-3);
      }
    });

    if(customResolution) {
      viewerWindow.setSize(Number(displaySettings.screenwidth), Number(displaySettings.screenheight));
    }

    registerEvents(viewerWindow);
    viewerWindow.webContents.on("login", (event, webContents, request, authInfo, cb)=>{
      if (proxy.configuration().username) {
        event.preventDefault();
        if (!cb) {cb = authInfo;}
        cb(proxy.configuration().username, proxy.configuration().password);
      }
    });

    return offlineCheck.startOfflineTimeoutIfRpp()
    .then(createPresentationUrl)
    .then((url)=>{
      if (proxy.configuration().hostname) {
        viewerWindow.webContents.session.setProxy({pacScript: proxy.pacScriptURL(), proxyBypassRules: "localhost"}, ()=>{});
        log.debug("using pac: " + proxy.pacScriptURL());
      }

      if (overrideUrl) {
        log.debug(`Overriding presentation at ${url}`);
        viewerWindow.loadURL(overrideUrl);
        return viewerWindow;
      }

      loadURL(viewerWindow, url);
    })
    .then(()=>{
      return new Promise((res)=>{
        let viewerTimeout = setTimeout(()=>{
          log.external("viewer load timeout");
          res(viewerWindow);
        }, 2.5 * 60 * 1000);

        viewerWindow.webContents.on("did-finish-load", ()=>{
          clearTimeout(viewerTimeout);
          res(viewerWindow);
        });
      });
    })
    .then(()=>{
      return new Promise((res)=>{
        if (overrideUrl || dataHandlerRegistered) {return res();}
        dataHandlerRegistered = res;
      });
    })
    .then(()=>{
      log.debug("viewer launch complete");
      return viewerWindow;
    })
    .catch((err)=>{
      log.external("viewer launch error", err);
      return viewerWindow;
    });
  },
  reload() {
    return module.exports.launch()
    .then((viewerWindow)=>{
      viewerWindowBindings.setWindow(viewerWindow);
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
        return;
      }
      viewerContentLoader.sendContentToViewer(content);
      scheduledReboot.scheduleRebootFromViewerContents(content);
    });
  },
  showDuplicateIdError() {
    let htmlPath = path.join(app.getAppPath(), "/dupe-id.html?" + commonConfig.getDisplaySettingsSync().displayid);
    viewerWindow.loadURL("file://" + htmlPath);
  }
};
