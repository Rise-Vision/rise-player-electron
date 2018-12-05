const assert = require("assert");
const simple = require("simple-mock");
const schedulePlayer = require("../../../main/scheduling/schedule-player");

describe.only("Schedule Player", ()=>{
  const played = [];
  const fallbackUrl = "about:blank";

  beforeEach(()=>{
    simple.mock(global.log, "external").returnWith();
  });

  afterEach(()=>{
    simple.restore();
    played.length = 0;
  });

  describe("Schedule Data Validation", ()=>{
    const testData = [
      null,
      {},
      {content: {}},
      {content: {schedule: {}}},
      {content: {schedule: {items: []}}},
      {content: {schedule: {items: ['invalid']}}},
    ];

    testData.forEach(test=>{
      it(`plays fallback url and logs external for ${JSON.stringify(test)}`, ()=>{
        schedulePlayer.setPlayUrlHandler(url=>played.push(url));

        schedulePlayer.start(test, fallbackUrl);

        assert.equal(global.log.external.lastCall.args[0], "invalid schedule data");
        assert(played[0], fallbackUrl);
      });
    });
  });
});
