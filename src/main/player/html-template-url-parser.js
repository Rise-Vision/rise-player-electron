const commonConfig = require("common-display-module");

module.exports = {
  restructureHTMLTemplatesToURLItems(content) {
    if (!content || !content.content || !content.content.schedule ||
    !content.content.schedule.items) {return content;}

    content = Object.assign({}, content);

    const HTMLTemplateURL = "https://widgets.risevision.com/STAGE/templates/PCODE/src/template.html?presentationId=PID";
    const isBeta = commonConfig.isBetaLauncher();

    content.content.schedule.items
    .filter(item=>item.presentationType === "HTML Template" && item.type === "presentation")
    .forEach(item=>{
      item.type = "url";
      const objectReference = item.objectReference;
      item.objectReference = HTMLTemplateURL
      .replace("STAGE", isBeta ? "beta" : "stable")
      .replace("PCODE", getPCode(objectReference))
      .replace("PID", objectReference);
    });

    return content;

    function getPCode(objectReference) {
      const pres = content.content.presentations
      .filter(pres=>pres.id === objectReference);

      return pres[0] && pres[0].productCode;
    }
  }
};
