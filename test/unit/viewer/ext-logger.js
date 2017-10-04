const assert = require("assert");
const viewerLogger = require("../../../viewer/ext-logger.js");
global.log = global.log || require("rise-common-electron").logger();

describe("External Viewer Logger", ()=>{
  it("exists", ()=>assert(!!viewerLogger));
});
