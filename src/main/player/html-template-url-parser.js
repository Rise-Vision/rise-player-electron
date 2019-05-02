const commonConfig = require("common-display-module");

module.exports = {
  restructureHTMLTemplatesToURLItems(content) {
    if (!content || !content.content || !content.content.schedule ||
    !content.content.schedule.items) {return content;}

    content = Object.assign({}, content);

    const HTMLTemplateURL = "https://widgets.risevision.com/STAGE/templates/PCODE/src/template.html?presentationId=PID";
    const isBeta = commonConfig.isBetaLauncher();

    content.content.schedule.items
    .filter(item=>item.presentationType === "HTML Template")
    .forEach(item=>{
      item.type = "url";
      item.objectReference = HTMLTemplateURL
      .replace("STAGE", isBeta ? "beta" : "stable")
      .replace("PCODE", getPCode(item.objectReference))
      .replace("PID", item.objectReference);
    });

    return content;

    function getPCode(objectReference) {
      const pres = content.content.presentations
      .filter(pres=>pres.id === objectReference);

      return pres[0] && pres[0].productCode;
    }
  }
};
