const bucketName = "risevision-display-notifications";
const commonConfig = require("common-display-module");
const gcs = require("../player//gcs.js");
const messaging = require("../player/messaging.js");
const onlineDetection = require("../player/online-detection.js");
const scheduledReboot = require("../player/scheduled-reboot.js");
const viewerWindowBindings = require("./window-bindings.js");

if (!Object.values) {require("object.values").shim();}
const presentationRewrites = {
  "online": {
    "http://s3.amazonaws.com/widget-web-page/1.0.0/dist/widget.html": "https://s3.amazonaws.com/widget-web-page/1.0.0/dist/widget.html"
  },
  "offline": {
    "http://s3.amazonaws.com/widget-image/0.1.1/dist/widget.html": "../widgets/image/widget.html",
    "http://s3.amazonaws.com/widget-video-rv/1.1.0/dist/widget.html" : "../widgets/video/widget.html",
    "http://s3.amazonaws.com/widget-text/1.0.0/dist/widget.html": "../widgets/text/widget.html",
    "http://s3.amazonaws.com/widget-google-spreadsheet/2.0.0/dist/widget.html": "../widgets/spreadsheet/widget.html",
    "http://s3.amazonaws.com/widget-web-page/1.0.0/dist/widget.html": "../widgets/webpage/widget.html",
    "http://s3.amazonaws.com/widget-time-date/1.0.0/dist/widget.html": "../widgets/time-date/widget.html",
    "http://s3.amazonaws.com/widget-rss/1.0.0/dist/widget.html": "../widgets/rss/widget.html"
  }
};

let contentPath;
let expectedReady = 0;
let readyReceived = 0;

function rewritePresentationData(content, isOnline) {
  content = Object.assign({}, content);

  if (!content || !content.content) {
    log.all("offline failure", "unexpected presentation format");
    return content;
  }

  if (!content.content.presentations) {
    log.debug("no presentations in viewer content");
    return content;
  }

  let statusText = isOnline ? "online" : "offline";
  let findReplaceMap = presentationRewrites[statusText];

  log.debug(`rewriting ${statusText} presentation data`);
  Object.keys(findReplaceMap).forEach((rewriteKey)=>{
    content.content.presentations.forEach((presntn)=>{
      let search = RegExp(rewriteKey, "g");
      let replace = findReplaceMap[rewriteKey];

      presntn.layout = presntn.layout.replace(search, replace);
    });
  });

  return content;
}

function countWidgets(content) {
  let count = 0;

  if (!content || !content.content || !content.content.presentations) {
    return count;
  }

  content.content.presentations.forEach((presntn)=>{
    if (!presntn.layout) {return;}

    Object.keys(presentationRewrites.offline).forEach((widgetString)=>{
      let search = RegExp(widgetString, "g");
      let matches = presntn.layout.match(search);
      if (matches) {count += matches.length;}
    });
  });

  return count;
}

module.exports = {
  init() {
    let displayId = commonConfig.getDisplaySettingsSync().displayid || "";
    contentPath = `${bucketName}/${displayId}/content.json`;

    log.debug("content path is " + contentPath);
    messaging.on("content-update", ()=>{
      return gcs.getFileContents(contentPath, {useLocalData: true, useThrottle: false})
      .then((content)=>{
        module.exports.sendContentToViewer(content);
        scheduledReboot.scheduleRebootFromViewerContents(content);
      })
      .catch((err)=>{
        log.external("could not retrieve viewer content", require("util").inspect(err));
      });
    });
  },
  sendContentToViewer(content) {
    expectedReady = countWidgets(content);
    readyReceived = 0;

    if (expectedReady) {log.external("expecting widget ready", expectedReady);}

    viewerWindowBindings.sendToViewer({
      msg: "content-update",
      newContent: rewritePresentationData(content, onlineDetection.isOnline())
    });
  },
  contentPath() {return contentPath;},
  expectedReadyCount() {return expectedReady;},
  incrementReady(widgetUrl) {
    let validWidgetURLs = viewerWindowBindings.offlineOrOnline() === "offline" ?
    Object.values(presentationRewrites.offline) :
    Object.keys(presentationRewrites.offline)
    .concat(Object.values(presentationRewrites.online));

    if (!validWidgetURLs.includes(widgetUrl)) {return;}
    readyReceived += 1;
    log.debug(`received ${readyReceived} of ${expectedReady} widget ready events`);
    if (readyReceived === expectedReady) {
      log.external("all widgets ready", viewerWindowBindings.offlineOrOnline());
    }
  }
};