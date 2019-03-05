const messaging = require("./messaging");

let contentData;

function checkExternalContent() {
  if (!contentData) {
    return;
  }

}

module.exports = {
  init() {
    messaging.onEvent("white-screen-detected", checkExternalContent);
  },
  setContent(data) {
    contentData = data;
  }
};
