const path = require("path");
const platform = require("rise-common-electron").platform;
const commonConfig = require("common-display-module");

const contentComparisonFileName = ".content-comparison.json";
const defaultPresentationId = "2b95b77e-839c-4674-b020-e2198df49061";

module.exports = {
  compareContentData(newData) {
    if (!validateData(newData)) { return Promise.reject(Error('invalid data')); }

    const newPresDates = newData.content.presentations ? getPresDatesFromContent(newData) : {
      id: "no-presentation",
      changeDate: "no-presentation"
    };

    const newSchedDate = newData.content.schedule ? {
      id: newData.content.schedule.id,
      changeDate: newData.content.schedule.changeDate
    } : {
      id: "no-schedule",
      changeDate: "no-schedule"
    };

    return readContentDates()
      .then(items => {
        const data = {
          presDates: newPresDates,
          schedDate: newSchedDate
        };
        return writeContentDates(data).then(() => items);
      })
      .then(items => {
        return {
          aPresentationHasChanged: presDatesChanged(items.presDates, newPresDates),
          theScheduleHasChanged: schedChanged(items.schedDate, newSchedDate)
        };
      });
  },
  presDatesChanged,
  getPresDatesFromContent,
  schedChanged
};

function validateData(newData) {
  if (!newData) { return false; }
  if (!newData.content) { return false; }
  if (!newData.content.presentations &&
    !isUsingURLItems(newData.content.schedule)) { return false; }
  if (!newData.content.schedule &&
    !isDefaultContentJson(newData.content.presentations)) { return false; }

  return true;
}

function isUsingURLItems(schedule) {
  return schedule && schedule.items && schedule.items.every(item => {
    return item.type && item.type === "url";
  });
}

function isDefaultContentJson(presentations) {
  return Array.isArray(presentations) &&
  presentations.length === 1 &&
  presentations[0].id === defaultPresentationId;
}

function getPresDatesFromContent({ content }) {
  return content.presentations.map(({ id, changeDate }) => ({ id, changeDate }))
    .reduce((presDates, idAndDate) => {
      return Object.assign({}, presDates, {
        [idAndDate.id]: idAndDate.changeDate
      });
    }, {});
}

function presDatesChanged(oldDates, newDates) {
  if (!oldDates || !newDates) { return; }

  return Object.keys(newDates)
    .some(presId => oldDates[presId] && oldDates[presId] !== newDates[presId]);
}

function schedChanged(oldSched, newSched) {
  if (!oldSched || !newSched) { return; }

  const differentSched = oldSched.id !== newSched.id;
  const modifiedSched = oldSched.changeDate !== newSched.changeDate;

  return differentSched || modifiedSched;
}

function readContentDates() {
  return new Promise(resolve => {
    if (!commonConfig.fileExists(contentComparisonFileName)) {
      return resolve({});
    }

    const filePath = path.join(commonConfig.getInstallDir(), contentComparisonFileName);
    return platform.readTextFile(filePath)
      .then(data => JSON.parse(data))
      .then(json => resolve(json))
      .catch(() => {
        log.error(`error loading ${contentComparisonFileName} contents`);
        resolve({});
      });
  });
}

function writeContentDates(items) {
  const filePath = path.join(commonConfig.getInstallDir(), contentComparisonFileName);
  return platform.writeTextFile(filePath, JSON.stringify(items, null, 2))
    .catch(() => log.error(`error updating ${contentComparisonFileName} contents`));
}
