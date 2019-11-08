const assert = require("assert");
const commonConfig = require("common-display-module");
const simple = require("simple-mock");
const parser = require("../../main/player/html-template-url-parser.js");

describe("HTML Template Url Parser", ()=>{
  beforeEach(()=>{
    simple.mock(commonConfig, "isStageEnvironment").returnWith(false);
  });

  afterEach(()=>{
    simple.restore();
  });

  const content = {
    content: {
      schedule: {
        items: [
          {
            name: "test-not-html-presentation",
            type: "url",
            objectReference: "ABC123"
          },
          {
            name: "test-html-presentation",
            presentationType: "HTML Template",
            type: "presentation",
            objectReference: "DEF456"
          }
        ]
      },
      presentations: [
        {
          id: "ABC123"
        },
        {
          id: "DEF456",
          productCode: "test-pcode"
        }
      ]
    }
  };

  it("idempotently sets html template presentations to url items with template url", ()=>{
    const expectedChangedType = "url";
    const HTMLTemplatePresentationId = "DEF456";
    const HTMLTemplatePresentationProductCode = "test-pcode";
    const expectedChangedObjectReference = `https://widgets.risevision.com/stable/templates/${HTMLTemplatePresentationProductCode}/src/template.html?presentationId=${HTMLTemplatePresentationId}`;

    const newContent = parser.restructureHTMLTemplatesToURLItems(
                       parser.restructureHTMLTemplatesToURLItems(
                       parser.restructureHTMLTemplatesToURLItems(content)));

    assert.deepEqual(newContent, {
      content: {
        schedule: {
          items: [
            {
              name: "test-not-html-presentation",
              type: "url",
              objectReference: "ABC123"
            },
            {
              name: "test-html-presentation",
              presentationType: "HTML Template",
              type: expectedChangedType,
              objectReference: expectedChangedObjectReference,
              presentationId: "DEF456",
              productCode: "test-pcode",
              version: "stable"
            }
          ]
        },
        presentations: [
          {
            id: "ABC123"
          },
          {
            id: "DEF456",
            productCode: "test-pcode"
          }
        ]
      }
    });
  });

  it("loads html template from staging url if player is configured to stage", ()=>{
    simple.mock(commonConfig, "isStageEnvironment").returnWith(true);

    const expectedChangedObjectReference = "https://widgets.risevision.com/staging/templates/test-pcode/src/template.html?presentationId=DEF456";

    const newContent = parser.restructureHTMLTemplatesToURLItems(
                       parser.restructureHTMLTemplatesToURLItems(
                       parser.restructureHTMLTemplatesToURLItems(content)));

    assert.deepEqual(newContent, {
      content: {
        schedule: {
          items: [
            {
              name: "test-not-html-presentation",
              type: "url",
              objectReference: "ABC123"
            },
            {
              name: "test-html-presentation",
              presentationType: "HTML Template",
              type: "url",
              objectReference: expectedChangedObjectReference,
              presentationId: "DEF456",
              productCode: "test-pcode",
              version: "staging"
            }
          ]
        },
        presentations: [
          {
            id: "ABC123"
          },
          {
            id: "DEF456",
            productCode: "test-pcode"
          }
        ]
      }
    });
  });
});
