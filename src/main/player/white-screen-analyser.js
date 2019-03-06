const messaging = require("./messaging");
const {net} = require("electron");

let contentData;

function checkURL(url) {
  const request = net.request(url);
  request.on('response', response => {
    console.log(`STATUS: ${response.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(response.headers)}`);
    response.on('data', (chunk) => {
      console.log(`BODY: ${chunk}`);
    });
    response.on('end', () => {
      console.log('No more data in response.');
    });
  });
  request.end();
}

function checkExternalContent() {
  if (!contentData) {
    return;
  }

  const riseVisionURLs = /(http(s)?:\/\/)?storage\.googleapis\.com\/risemedialibrary.+|(http(s)?:\/\/)?widgets\.risevision\.com\/.+/;
  const scheduleItems = contentData.content.schedule.items;
  const externalURLs = scheduleItems.filter(item => item.type === "url" && !riseVisionURLs.test(item.objectReference));
  externalURLs.forEach(url => checkURL(url));
}

module.exports = {
  init() {
    messaging.onEvent("white-screen-detected", checkExternalContent);
  },
  setContent(data) {
    contentData = data;
  }
};
