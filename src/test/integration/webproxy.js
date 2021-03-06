const ElectronProxyAgent = require('electron-proxy-agent');
const commonConfig = require("common-display-module");
const network = require("rise-common-electron").network;
const simple = require("simple-mock");
const electron = require("electron");
const {ipcMain, session} = require("electron");
network.registerProxyUpdatedObserver = ()=>{};

const assert = require("assert"),
httpFetch = require("rise-common-electron").network.httpFetch,
proxy = require("rise-common-electron").proxy,
viewerController = require("../../main/viewer/controller.js"),
configLogger = require("../../main/loggers/config-logger.js"),
onlineDetection = require("../../main/player/online-detection.js"),
http = require("http"),
directPort = 8080,
proxyPort = 9090,
proxyPortWithChallenge = 9595,
directUrl = `http://localhost:${directPort}`;

global.log = require("rise-common-electron").logger();

describe("Proxy Integration", function() {
  let proxies = [], proxied = [], proxyCallback = ()=>{}, electronAuthSuppliedCallback = ()=>{}, win;

  this.timeout(5000);

  beforeEach(()=>{
    simple.mock(log, "debug").callFn(console.log);
  });
  afterEach(()=>{
    simple.restore();
  });

  before(()=>{
    let directServer = http.createServer((req, resp)=>{
      resp.end("direct");
    });
    directServer = require("http-shutdown")(directServer);
    directServer.on("connection", skt=>skt.unref());
    directServer.listen(directPort);
    proxies.push(directServer);

    let proxyServer = http.createServer((req, resp)=>{
      if (Array.isArray(proxied)) {proxied.push(req.headers.host);}
      proxyCallback();
      resp.end(req.headers["proxy-authorization"] ? "proxy-with-auth" : "proxy");
    });
    proxyServer = require("http-shutdown")(proxyServer);
    proxyServer.on("connection", skt=>skt.unref());
    proxyServer.listen(proxyPort);
    proxies.push(proxyServer);

    let authServer = http.createServer((req, resp)=>{
      if (Array.isArray(proxied)) {proxied.push(req.headers.host);}
      resp.statusCode = 407;
      resp.setHeader("Proxy-Authenticate", "Basic");
      if (req.headers["proxy-authorization"]) {electronAuthSuppliedCallback();}
      resp.end("auth-required-proxy");
    });
    authServer = require("http-shutdown")(authServer);
    authServer.on("connection", skt=>skt.unref());
    authServer.listen(proxyPortWithChallenge);
    proxies.push(authServer);
  });

  after(()=>{
    proxies.forEach(server=>{server.unref(); server.shutdown();});
    win && !win.isDestroyed() && win.close();
  });

  function assertUsedServer(type, resp) {
    return resp.text().then((text)=>{
      assert(text.includes(type));
    });
  }

  beforeEach(()=>{
    simple.mock(log, "debug").callFn(console.log);
    simple.mock(onlineDetection, "isOnline").returnWith(true);
    simple.mock(configLogger,"logClientInfo").returnWith(true);
    simple.mock(global.log,"error").returnWith(true);
    simple.mock(global.log,"external").returnWith(true);
    simple.mock(global.log,"file").returnWith(true);
    simple.mock(ipcMain, "on", (evt, handler)=>{
      handler("test", {message: "data-handler-registered"});
    });
  });

  afterEach(()=>{
    network.setNodeAgents();
    simple.restore();
  });

  describe("Internal Node HTTP Fetch", ()=>{
    it("uses a proxy", ()=>{
      var proxyAgent = new ElectronProxyAgent({
        resolveProxy : function(url, callback) {
          callback("PROXY localhost:9090; DIRECT");
        }
      });
      simple.mock(proxy, "configuration").returnWith({host:"http://localhost:9090"});

      network.setNodeAgents(proxyAgent, proxyAgent);

      return httpFetch(directUrl)
      .then(assertUsedServer.bind(null, "proxy"));
    });

    it("uses a proxy with auth", ()=>{
      var proxyAgent = new ElectronProxyAgent({
        resolveProxy : function(url, callback) {
          callback("PROXY localhost:9090; DIRECT");
        }
      }, "user", "pass");
      simple.mock(proxy, "configuration").returnWith({host:"http://localhost:9090"});

      network.setNodeAgents(proxyAgent, proxyAgent);

      return httpFetch(directUrl)
      .then(assertUsedServer.bind(null, "proxy-with-auth"));
    });

    it("doesn't use a proxy when proxy is not set", ()=>{
      proxy.setEndpoint({});
      return httpFetch(directUrl)
      .then(assertUsedServer.bind(null, "direct"));
    });
  });
  describe("Electron Browser", function() {
    this.timeout(16000);
    beforeEach("reset", ()=>{
      proxied = [];
      electronAuthSuppliedCallback = ()=>{};
      proxyCallback = ()=>{};
    });

    afterEach("close", ()=>{
      return new Promise(res=>{
        setTimeout(res, 500);
      })
      .then(()=>{
        win && !win.isDestroyed() && win.close();
      });
    });

    it("uses a proxy with proxy configuration", ()=>{
      let {BrowserWindow, app, globalShortcut} = require("electron");
      proxy.setSaveDir(commonConfig.getInstallDir());
      proxy.setEndpoint({hostname: "localhost", port: proxyPort});

      viewerController.init(BrowserWindow, app, globalShortcut, ipcMain, electron);

      return new Promise(res=>{
        proxyCallback = res;

        win = viewerController.createViewerWindow("http://www.google.com");
      })
      .then(()=>{
        assert.ok(proxied.some(prox=>prox.includes("www.google.com")));
      });
    });

    it("uses a proxy with browser configuration", ()=>{
      let {BrowserWindow, app, globalShortcut} = require("electron");

      proxy.setSaveDir(commonConfig.getInstallDir());

      return new Promise(res=>{
        proxyCallback = res;

        return session.defaultSession.setProxy({proxyRules: "localhost:9090"}, ()=>{
          viewerController.init(BrowserWindow, app, globalShortcut, ipcMain, electron);

          viewerController.launch("about:blank")
          .then(viewerWindow=>{
            viewerWindow.loadURL("http://www.google.com");
            win = viewerWindow;
          });
        });
      })
      .then(()=>{
        assert.ok(proxied.some(prox=>{return prox.includes("www.google.com");}));
      });
    });

    it("bypasses local addresses", ()=>{
      let {BrowserWindow, app, globalShortcut} = require("electron");
      proxy.setEndpoint({hostname: "localhost", port: 9090});
      viewerController.init(BrowserWindow, app, globalShortcut, ipcMain, electron);
      return viewerController.launch("http://localhost:8080")
      .then((viewerWindow)=>{
        win = viewerWindow;
        assert.ok(!proxied.includes("localhost"));
      });
    });

    it("doesn't use a proxy when proxy is cleared", ()=>{
      let {BrowserWindow, app, globalShortcut} = require("electron");
      proxy.setEndpoint();
      viewerController.init(BrowserWindow, app, globalShortcut, ipcMain, electron);
      return viewerController.launch("about:blank")
      .then((viewerWindow)=>{
        win = viewerWindow;
        return new Promise((res)=>{
          setTimeout(res, 1000);
        }).then(()=>{
          assert(!proxied.some((prox)=>{return prox.includes("appspot.com");}));
          return new Promise((res)=>{setTimeout(res, 500);});
        });
      });
    });

    it("handles auth with a login response", ()=>{
      let {BrowserWindow, app, globalShortcut} = require("electron");

      proxy.setSaveDir(require("os").tmpdir());
      proxy.setEndpoint({
        hostname: "localhost",
        port: proxyPortWithChallenge,
        username: "user",
        password: "pw"
      });

      viewerController.init(BrowserWindow, app, globalShortcut, ipcMain, electron);

      return new Promise(res=>{
        electronAuthSuppliedCallback = res;

        win = viewerController.createViewerWindow("http://www.google.com");
      })
      .then(()=>{
        assert.ok(proxied.includes("www.google.com"));
      })
      .catch((err)=>{console.log(err);});
    });
  });
});
