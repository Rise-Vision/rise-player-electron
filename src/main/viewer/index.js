const controller = require("./controller.js");
const contentLoader = require("./content-loader.js");

module.exports = {
  launch() {
    contentLoader.init();
    return controller.launch();
  }
};
