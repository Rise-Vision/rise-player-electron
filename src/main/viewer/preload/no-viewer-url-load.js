(function() {
  const ipc = require("electron").ipcRenderer;

  ipc.on("load-url", (event, url)=>{
    window.location.href = url;
  });
}());
