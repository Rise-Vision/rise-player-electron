const commonConfig = require("common-display-module");

module.exports = {
  restructureHTMLTemplatesToURLItems(content) {
    if (!content || !content.content || !content.content.schedule ||
    !content.content.schedule.items) {return content;}

    content = Object.assign({}, content);

    const HTMLTemplateURL = "https://widgets.risevision.com/STAGE/templates/PCODE/src/template.html?presentationId=PID";
    const isBeta = commonConfig.isBetaLauncher();
    const originalItems = content.content.schedule.items;

    content.content.schedule.items = originalItems.map(item=>{
      return !needsRewrite(item) ? item :
        Object.assign({}, item, {
          type: "url",
          objectReference: setNewReference(item.objectReference)
        });
    });

    return content;

    function needsRewrite(item) {
      return item.type === "presentation" && item.presentationType === "HTML Template";
    }

    function setNewReference(oldReference) {
      return HTMLTemplateURL
      .replace("STAGE", isBeta ? "beta" : "stable")
      .replace("PCODE", getPCode(oldReference))
      .replace("PID", oldReference);
    }

    function getPCode(objectReference) {
      const pres = content.content.presentations
      .filter(pres=>pres.id === objectReference);

      return pres[0] && pres[0].productCode;
    }
  }
};
