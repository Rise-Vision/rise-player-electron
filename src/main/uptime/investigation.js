const network = require("rise-common-electron").network;
const timeout = 3000;

const siteList = [
  "https://services.risevision.com/healthz",
  "https://widgets.risevision.com/viewer/Viewer.html",
  "https://storage-dot-rvaserver2.appspot.com",
  "https://store.risevision.com",
  "http://s3.amazonaws.com/widget-video-rv/1.1.0/dist/widget.html",
  "https://s3.amazonaws.com/widget-video-rv/1.1.0/dist/widget.html",
  "https://storage.googleapis.com/install-versions.risevision.com/display-modules-manifest.json",
  "https://www.googleapis.com/storage/v1/b/install-versions.risevision.com/o/installer-win-64.exe?fields=kind"
];

module.exports = {
  reportConnectivity() {
    siteList.forEach(site=>{
      return network.httpFetch(site, {timeout})
      .then(res=>{
        log.external("downtime network check", `${res.statusCode} - ${site}`);
      }).catch((error)=>{
        log.external("downtime network error", `${error} - ${site}`);
      });
    });
  }
};
