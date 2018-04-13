const fs = require("fs");

require("./ipc");
require("./screenshot");
setInterval(()=>{
  fs.writeFileSync("/home/rise/rvplayer/player-renderer-mem.out", Date() + "\n" + JSON.stringify(process.getProcessMemoryInfo(), null, 2) + "\n", {flag: "a"});
}, 5000);
