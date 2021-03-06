const commonConfig = require("common-display-module");

module.exports = {
  restructureHTMLTemplatesToURLItems(contentData) {
    if (!contentData || !contentData.content || !contentData.content.schedule ||
    !contentData.content.schedule.items) {return contentData;}

    const restructuredData = JSON.parse(JSON.stringify(contentData));

    const HTMLTemplateURL = "https://widgets.risevision.com/STAGE/templates/PCODE/src/template.html?presentationId=PID";
    const isStage = commonConfig.isStageEnvironment();

    restructuredData.content.schedule.items
    .filter(item=>(item.type === "presentation" && item.presentationType === "HTML Template"))
    .forEach(item=>{
      item.type = "url";
      item.presentationId = item.objectReference;
      item.productCode = getPCode(item.objectReference, contentData);
      item.version = isStage ? "staging" : "stable";
      item.objectReference = HTMLTemplateURL
        .replace("STAGE", item.version)
        .replace("PCODE", item.productCode)
        .replace("PID", item.presentationId);
    });

    return restructuredData;
  }
};

function getPCode(objectReference, contentData) {
  const referencedPresentation = contentData.content.presentations
  .filter(pres=>pres.id === objectReference);

  return referencedPresentation[0] && referencedPresentation[0].productCode;
}
