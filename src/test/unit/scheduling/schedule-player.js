const assert = require("assert");
const simple = require("simple-mock");
const schedulePlayer = require("../../../main/scheduling/schedule-player");
const scheduleParser = require("../../../main/scheduling/schedule-parser");
const FALLBACK_URL = schedulePlayer.getFallbackUrl();

describe.only("Schedule Player", ()=>{
  const mockSetTimeout = simple.stub();
  const played = [];

  beforeEach(()=>{
    simple.mock(global.log, "external").returnWith();
  });

  afterEach(()=>{
    simple.restore();
  });

  describe("Schedule Data Validation", ()=>{
    const testData = [
      null,
      {},
      {content: {}},
      {content: {schedule: {}}},
      {content: {schedule: {items: []}}},
      {content: {schedule: {items: ['should be an object']}}},
    ];

    testData.forEach(test=>{
      it(`plays fallback url and logs external for ${JSON.stringify(test)}`, ()=>{
        played.length = 0;
        scheduleParser.setContent(testData);
        schedulePlayer.setPlayUrlHandler(url=>played.push(url));

        schedulePlayer.start(mockSetTimeout);

        assert.equal(global.log.external.lastCall.args[0], "invalid schedule data");
        assert.equal(played[0], FALLBACK_URL);
      });
    });
  });

  describe("Playability re-check", ()=>{
    it("Doesn't re-check for playability if everything is 24/7", ()=>{
      const testData = {content: {
        schedule: {
          timeDefined: false,
          items: [
            {
              timeDefined: false
            }
          ]
        }}};

      scheduleParser.setContent(testData);
      schedulePlayer.start(mockSetTimeout);
      assert.equal(mockSetTimeout.callCount, 0);
    });
  });
});
