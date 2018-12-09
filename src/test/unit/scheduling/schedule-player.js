const assert = require("assert");
const simple = require("simple-mock");
const schedulePlayer = require("../../../main/scheduling/schedule-player");
const scheduleParser = require("../../../main/scheduling/schedule-parser");
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

    const nothingPlayingListener = simple.spy();

    testData.forEach(test=>{
      it(`calls nothing playing handler and logs external for ${JSON.stringify(test)}`, ()=>{
        scheduleParser.setContent(testData);
        schedulePlayer.listenForNothingPlaying(nothingPlayingListener);

        schedulePlayer.start();

        assert.equal(global.log.external.lastCall.args[0], "invalid schedule data");
        assert(nothingPlayingListener.called);
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

  describe.only("Scenarios", ()=>{
    let timedCalls = [];
    let simulatedTimeDate;
    let timerId = 0;

    beforeEach(()=>{
      setTimeout.reset();
      simple.mock(schedulePlayer, "now").callFn(()=>simulatedTimeDate);
      simple.mock(global, "setTimeout").callFn((fn, millis)=>{
        timerId++;
        timedCalls.push([fn, simulatedTimeDate.getTime() + millis, timerId]);
        return timerId;
      });
      simple.mock(global, "clearTimeout").callFn(clearableId=>{
        timedCalls = timedCalls.filter(call=>call[2] !== clearableId);
      });

      schedulePlayer.stop();
    });

    describe("24x7 primary schedule with two 24x7 items", ()=>{
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

      it("continuously alternates between the two presentations", ()=>{
        simulatedTimeDate = new Date("12-23-2018 3:00:00 PM");

        scheduleParser.setContent(testData);
        schedulePlayer.start();

        timeTravelTo("12-23-2018 3:00:01 PM");
        assert.equal(played.length, 1);
        assert.equal(played[played.length - 1], "test-url-1");

        timeTravelTo("12-23-2018 3:00:11 PM");
        assert.equal(played.length, 2);
        assert.equal(played[played.length - 1], "test-url-2");

        timeTravelTo("12-23-2018 3:01:00 PM");
        assert.equal(played.length, 7);
        assert.equal(played.filter(url=>url.endsWith("1")).length, 4);
        assert.equal(played.filter(url=>url.endsWith("2")).length, 3);
        assert.equal(played[played.length - 1], "test-url-1");
      });
    });

    describe("9 to 5 primary schedule with two 24x7 items", ()=>{
      const testData = {content: {
        schedule: {
          name: "test schedule 9 to 5",
          timeDefined: true,
          startDate: "Dec 5, 2018 12:00:00 AM",
          startTime: "Dec 6, 2018 9:00:00 AM",
          endTime: "Dec 6, 2018 5:00:00 PM",

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

      it("alternates between the two presentations until outside primary schedule time", ()=>{
        simulatedTimeDate = new Date("12-05-2018 3:00:00 PM");
        const tenSecondRotationsinTwoHours = 720;

        scheduleParser.setContent(testData);
        schedulePlayer.start();

        timeTravelTo("12-05-2018 7:00:00 PM");
        assert.equal(played.length, tenSecondRotationsinTwoHours);
      });
    });

    function timeTravelTo(targetTimeMillis) {
      if (typeof targetTimeMillis === "string") {targetTimeMillis = Date.parse(targetTimeMillis);}
      if (typeof targetTime === "object") {targetTimeMillis = targetTimeMillis.getTime();}

      if (targetTimeMillis === simulatedTimeDate.getTime()) {return;}
      if (targetTimeMillis < simulatedTimeDate.getTime()) {
        throw Error("Cannot travel backwards through time");
      }

      while (timedCalls.length) {
        timedCalls.sort((a, b)=>a[1] - b[1]);

        if (timedCalls[0][1]  > targetTimeMillis) {return;}

        simulatedTimeDate = new Date(timedCalls[0][1]);
        timedCalls.shift()[0]();
      }
    }
  });

});
