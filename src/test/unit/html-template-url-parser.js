const assert = require("assert");
const commonConfig = require("common-display-module");
const simple = require("simple-mock");
const parser = require("../../main/player/html-template-url-parser.js");

describe.only("HTML Template Url Parser", ()=>{
  beforeEach(()=>{
    simple.mock(commonConfig, "isBetaLauncher").returnWith(false);
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

  it("Idempotently sets html template presentations to url items with template url", ()=>{
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
              objectReference: expectedChangedObjectReference
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
