const assert = require("assert");
const simple = require("simple-mock");
const schedulePlayer = require("../../../main/scheduling/schedule-player");
const scheduleParser = require("../../../main/scheduling/schedule-parser");
const FALLBACK_URL = schedulePlayer.getFallbackUrl();
const ONE_MINUTE_MILLIS = 60000;

describe("Schedule Player", ()=>{
  const played = [];

  beforeEach(()=>{
    simple.mock(global.log, "external").returnWith();
    simple.mock(global, "setTimeout").returnWith();
    schedulePlayer.setPlayUrlHandler(url=>played.push(url));
    played.length = 0;
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
        scheduleParser.setContent(testData);

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
              timeDefined: false,
              duration: 10
            }
          ]
        }}};

      scheduleParser.setContent(testData);
      schedulePlayer.start();
      assert(setTimeout.firstCall.args[0].name !== "start");
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
              timeDefined: false,
              duration: 10
            }
          ]
        }
      }};

      scheduleParser.setContent(testData);
      schedulePlayer.start();
      assert(setTimeout.firstCall.args[0].name === "start");
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
      assert(setTimeout.firstCall.args[0].name === "start");
      assert(scheduledDelayFor(startTimeMillisFromNow));
    });

    it("schedules the earliest item", ()=>{
      const startTimeMillisFromNow = 5000;
      const laterStartTimeMillisFromNow = 20000;

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
              startTime: new Date(Date.now() + laterStartTimeMillisFromNow)
            },
            {
              name: "test item 2",
              timeDefined: true,
              startDate: new Date(),
              startTime: new Date(Date.now() + startTimeMillisFromNow)
            }
          ]
        }
      }};

      scheduleParser.setContent(testData);
      schedulePlayer.start();
      assert(setTimeout.firstCall.args[0].name === "start");
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
      assert(setTimeout.firstCall.args[0].name === "start");
      assert(scheduledForTomorrow());
    });

    function scheduledDelayFor(expectedDelay) {
      const allowedVariance = 100;
      const scheduledDelay = setTimeout.firstCall.args[1];

      return expectedDelay - scheduledDelay < allowedVariance;
    }

    function scheduledForTomorrow() {
      const acceptableMillisPrecisionIntoNextDay = 10000;

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0);
      tomorrow.setMinutes(0);
      tomorrow.setSeconds(0);

      const scheduledDelay = setTimeout.firstCall.args[1];
      const scheduledDate = new Date(Date.now() + scheduledDelay);

      return scheduledDate - tomorrow > 0 &&
      scheduledDate - tomorrow < acceptableMillisPrecisionIntoNextDay;
    }
  });

  describe("Current playable items", ()=>{
    it("logs externally if no playable items exist", ()=>{
      const futureStartTime = new Date(Date.now() + 5000);
      const testData = {content: {
        schedule: {
          name: "test schedule",
          timeDefined: false,
          items: [
            {
              name: "future item",
              timeDefined: true,
              startDate: new Date(Date.now()),
              startTime: futureStartTime,
              endTime: new Date(futureStartTime.getTime() + ONE_MINUTE_MILLIS),
              objectReference: "test-url-1"
            }
          ]
        }
      }};
      scheduleParser.setContent(testData);
      schedulePlayer.start();

      assert.equal(log.external.lastCall.args[0], "no playable items");
    });

    it("plays playable items", ()=>{
      setTimeout.reset();

      simple.mock(global, "setTimeout")
      .callbackAtIndex(0)
      .returnWith();

      const testData = {content: {
        schedule: {
          name: "test schedule",
          timeDefined: false,
          items: [
            {
              name: "test item 1",
              timeDefined: false,
              objectReference: "test-url-1",
              duration: 10
            },
            {
              name: "test item 2",
              timeDefined: false,
              objectReference: "test-url-2",
              duration: 10
            }
          ]
        }
      }};
      scheduleParser.setContent(testData);
      schedulePlayer.start();

      assert(played.includes("test-url-1") && played.includes("test-url-2"));
    });

    it("doesn't play playable items if they have no duration", ()=>{
      setTimeout.reset();

      simple.mock(global, "setTimeout")
      .callbackAtIndex(0)
      .returnWith();

      const testData = {content: {
        schedule: {
          name: "test schedule",
          timeDefined: false,
          items: [
            {
              name: "test item 1",
              timeDefined: false,
              objectReference: "test-url-1",
              duration: 0,
            },
            {
              name: "test item 2",
              timeDefined: false,
              objectReference: "test-url-2"
            }
          ]
        }
      }};
      scheduleParser.setContent(testData);
      schedulePlayer.start();

      assert.equal(played.length, 0);
    });

    it("doesn't reload a url duplicated in multiple schedule items", ()=>{
      setTimeout.reset();

      simple.mock(global, "setTimeout")
      .callbackAtIndex(0)
      .returnWith();

      const testData = {content: {
        schedule: {
          name: "test schedule",
          timeDefined: false,
          items: [
            {
              name: "test item 1",
              timeDefined: false,
              objectReference: "test-same-url",
              duration: 10
            },
            {
              name: "test item 2",
              timeDefined: false,
              objectReference: "test-same-url",
              duration: 10
            }
          ]
        }
      }};
      scheduleParser.setContent(testData);
      schedulePlayer.start();

      assert(played.length === 1);
      assert(played.includes("test-same-url"));
    });

    it("continues playing item if start is called and item is still valid", ()=>{
      setTimeout.reset();
      simple.mock(global, "setTimeout").returnWith();

      const testData = {content: {
        schedule: {
          name: "test schedule",
          timeDefined: false,
          items: [
            {
              name: "test item 5",
              timeDefined: false,
              objectReference: "test-url-1",
              duration: 10
            },
            {
              name: "test item 6",
              timeDefined: false,
              objectReference: "test-url-2",
              duration: 10
            }
          ]
        }
      }};
      scheduleParser.setContent(testData);
      schedulePlayer.start();
      schedulePlayer.start();

      assert(played.includes("test-url-1") && !played.includes("test-url-2"));
    });
  });

  describe("System time", ()=>{
    xit("handles a system time change (eg: DST)", ()=>{
      assert(false);
    });
  });
});
