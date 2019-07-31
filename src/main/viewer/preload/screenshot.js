const {desktopCapturer} = require("electron");
const screen = parseInt(process.versions.electron) >= 6 ? require("electron").remote.screen : require("electron").screen;
const screenSize = screen.getPrimaryDisplay().size;

window.receiveFromPlayer("viewer-screenshot-request", ()=>{
  desktopCapturer.getSources({
    types:["screen"],
    thumbnailSize: screenSize
  }, (err, sources)=>{
    window.postToPlayer({
      msg: "viewer-screenshot-result",
      err,
      thumbnail: sources[0].thumbnail.toDataURL()
    }, true);
  });
});
