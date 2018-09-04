const util = require("util");
const contentComparison = require('./content-comparison');

module.exports = {
  logContentChanges(contentData) {
    contentComparison.compareContentData(contentData)
    .then(result=>{
      if (!result) {return;}

      const {aPresentationHasChanged, theScheduleHasChanged} = result;

      if (aPresentationHasChanged) {log.external('presentation updated');}
      if (theScheduleHasChanged) {log.external('schedule updated');}
    })
    .catch(err=>log.external('Error comparing content.json data', util.inspect(err)));
  }
};
