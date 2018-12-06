const assert = require("assert");
const simple = require("simple-mock");
const schedulePlayer = require("../../../main/scheduling/schedule-player");
const scheduleParser = require("../../../main/scheduling/schedule-parser");
const FALLBACK_URL = schedulePlayer.getFallbackUrl();

describe.only("Schedule Player", ()=>{
  const played = [];

  beforeEach(()=>{
    simple.mock(global.log, "external").returnWith();
    simple.mock(global, "setTimeout").returnWith();
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

        schedulePlayer.start();

        assert.equal(global.log.external.lastCall.args[0], "invalid schedule data");
        assert.equal(played[0], FALLBACK_URL);
      });
    });
  });

  describe("Playability re-check", ()=>{
    it("doesn't schedule a check for playability if everything is 24/7", ()=>{
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
      schedulePlayer.start();
      assert.equal(setTimeout.callCount, 0);
    });

    it("schedules a check for playability if schedule start time later in the day", ()=>{
      const startTimeMillisFromNow = 5000;

      const testData = {content: {
        schedule: {
          name: "test schedule",
          timeDefined: true,
          startDate: new Date(),
          startTime: new Date(Date.now() + startTimeMillisFromNow),
          items: [
            {
              name: "test item 1",
              timeDefined: false
            }
          ]
        }
      }};

      scheduleParser.setContent(testData);
      schedulePlayer.start();
      assert.equal(setTimeout.callCount, 1);
      assert(scheduledDelayFor(startTimeMillisFromNow));
    });

    it("schedules a check for playability if an item start time is later in the day", ()=>{
      const startTimeMillisFromNow = 5000;

      const testData = {content: {
        schedule: {
          name: "test schedule",
          timeDefined: true,
          startDate: new Date(),
          startTime: new Date(),
          items: [
            {
              name: "test item 1",
              timeDefined: true,
              startDate: new Date(),
              startTime: new Date(Date.now() + startTimeMillisFromNow)
            }
          ]
        }
      }};

      scheduleParser.setContent(testData);
      schedulePlayer.start();
      assert.equal(setTimeout.callCount, 1);
      assert(scheduledDelayFor(startTimeMillisFromNow));
    });

    it("schedules a check for playability at the start of the next day", ()=>{
      const testData = {content: {
        schedule: {
          name: "test schedule",
          timeDefined: true,
          startDate: new Date(),
          startTime: new Date(Date.now()),
          items: [
            {
              name: "test item 1",
              timeDefined: true,
              startDate: new Date(),
              startTime: new Date()
            }
          ]
        }
      }};

      scheduleParser.setContent(testData);
      schedulePlayer.start();
      assert.equal(setTimeout.callCount, 1);
      assert(scheduledForTomorrow());
    });

    function scheduledDelayFor(expectedDelay) {
      const allowedVariance = 100;
      const scheduledDelay = setTimeout.lastCall.args[1];

      return expectedDelay - scheduledDelay < allowedVariance;
    }

    function scheduledForTomorrow() {
      const acceptableMillisPrecisionIntoNextDay = 10000;

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0);
      tomorrow.setMinutes(0);
      tomorrow.setSeconds(0);

      const scheduledDelay = setTimeout.lastCall.args[1];
      const scheduledDate = new Date(Date.now() + scheduledDelay);

      return scheduledDate - tomorrow > 0 &&
      scheduledDate - tomorrow < acceptableMillisPrecisionIntoNextDay;
    }
  });
});
