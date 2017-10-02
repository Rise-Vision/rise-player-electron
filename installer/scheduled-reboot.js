const reboot = requireRoot("installer/reboot.js").reboot;

module.exports = {
  scheduleRebootFromViewerContents(content) {
    if (!(content && content.display && content.display.restartEnabled)) {return;}

    let restartHHMM = content.display.restartTime;

    if (!(content.display.restartTime && content.display.restartTime.includes(":"))) {
      log.external("scheduled reboot error", "invalid reboot schedule time " + content.display.restartTime);
      return;
    }

    let dt = new Date();
    dt.setHours(parseInt(restartHHMM.split(":")[0], 10));
    dt.setMinutes(parseInt(restartHHMM.split(":")[1], 10));
    if (dt < new Date()) {dt.setDate(dt.getDate() + 1);}

    log.debug("Scheduling reboot for " + dt);
    setTimeout(reboot, dt - new Date());
  }
};
