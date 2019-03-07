const messaging = require("./messaging");
const {net} = require("electron");

let contentData;

module.exports = {
  init() {
    messaging.onEvent("white-screen-detected", checkExternalContent);
  },
  setContent(data) {
    contentData = data;
  }
};

function checkExternalContent() {
  if (!contentData) {
    return;
  }

  const riseVisionURLs = /(http(s)?:\/\/)?storage\.googleapis\.com\/risemedialibrary.+|(http(s)?:\/\/)?widgets\.risevision\.com\/.+/;
  const scheduleItems = contentData.content.schedule.items;
  const externalURLs = scheduleItems.filter(item => item.type === "url" && !riseVisionURLs.test(item.objectReference)).map(item => item.objectReference);
  externalURLs.forEach(url => checkURL(url));
}

function checkURL(url) {
  const request = net.request(url);
  request.on("error", error => {
    log.external("white screen external URL check error", JSON.stringify({url, error: error.message}));
  });

  request.on("login", (authInfo, callback) => {
    log.external("white screen external URL check login", JSON.stringify(Object.assign({}, authInfo, {url})));
    callback();
  });

  request.on("response", response => {
    log.external("white screen external URL check response", JSON.stringify({url, statusCode: response.statusCode}));
  });
  request.end();
}
