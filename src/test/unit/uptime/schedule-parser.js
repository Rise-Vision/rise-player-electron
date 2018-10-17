const assert = require("assert");

const scheduleParser = require("../../../main/uptime/schedule-parser");

const JAN = 0, FEB = 1, APR = 3, JUN = 5, JUL = 6;

describe("Schedule Parser", () => {

  const startDate = new Date(2016, FEB, 1),
    endDate = new Date(2016, JUN, 30),
    startTime = new Date(0, 0, 0, 12, 30),
    endTime = new Date(0, 0, 0, 18, 15),
    timeline = { timeDefined: true, startDate, endDate, startTime, endTime };

  it("it can play if not time defined", () => {
    assert.equal(scheduleParser.canPlay({ timeDefined: false }), true);
  });

  it("it can play if start time is not defined", () => {
    assert.equal(scheduleParser.canPlay({}), true);
  });

  it("it cannot play if date is before startDate", () => {
    const beforeDate = new Date(2016, JAN, 1);
    assert.equal(scheduleParser.canPlay(timeline, beforeDate), false);
  });

  it("it cannot play if date is after endDate", () => {
    const afterDate = new Date(2016, JUL, 1);
    assert.equal(scheduleParser.canPlay(timeline, afterDate), false);
  });

  it("it cannot play if time is before startTime, with startTime < endTime", () => {
    const beforeTime = new Date(2016, FEB, 3, 11, 30);
    const afterTime = new Date(2016, FEB, 3, 19, 30);

    assert.equal(scheduleParser.canPlay(timeline, beforeTime), false);
    assert.equal(scheduleParser.canPlay(timeline, afterTime), false);
  });

  it("it cannot play if time is out of range, with endTime < startTime", () => {
    const startTime = new Date(0, 0, 0, 22, 30),
      endTime = new Date(0, 0, 0, 9, 15),
      timeline = { timeDefined: true, startDate, endDate, startTime, endTime };
    const beforeTime = new Date(2016, FEB, 3, 16, 30);
    const afterTime = new Date(2016, FEB, 3, 12, 30);

    assert.equal(scheduleParser.canPlay(timeline, beforeTime), false);
    assert.equal(scheduleParser.canPlay(timeline, afterTime), false);
  });

  it("it can play if daily recurrence frequency matches", () => {
    const duringDate = new Date(2016, FEB, 11);
    const timeline = { timeDefined: true, startDate, endDate,
      recurrenceType: "Daily", recurrenceFrequency: 10 };

    assert.equal(scheduleParser.canPlay(timeline, duringDate), true);
  });

  it("it cannot play if daily recurrence frequency does not match", () => {
    const duringDate = new Date(2016, FEB, 4);
    const timeline = { timeDefined: true, startDate, endDate,
      recurrenceType: "Daily", recurrenceFrequency: 2 };

    assert.equal(scheduleParser.canPlay(timeline, duringDate), false);
  });

  it("it can play if weekly recurrence frequency matches", () => {
    const duringDate = new Date(2016, FEB, 22);
    const timeline = { timeDefined: true, startDate, endDate,
      recurrenceType: "Weekly", recurrenceFrequency: 3, recurrenceDaysOfWeek: "Mon" };

    assert.equal(scheduleParser.canPlay(timeline, duringDate), true);
  });

  it("it can play if weekly recurrence frequency matches", () => {
    const duringDate = new Date(2016, FEB, 22);
    const timeline = { timeDefined: true, startDate, endDate,
      recurrenceType: "Weekly", recurrenceFrequency: 3, recurrenceDaysOfWeek: ["Mon"] };

    assert.equal(scheduleParser.canPlay(timeline, duringDate), true);
  });

  it("it cannot play if weekly recurrence days is not specified", () => {
    const duringDate = new Date(2016, FEB, 22);
    const timeline = { timeDefined: true, startDate, endDate,
      recurrenceType: "Weekly", recurrenceFrequency: 3 };

    assert.equal(scheduleParser.canPlay(timeline, duringDate), false);
  });

  it("it cannot play if weekly recurrence frequency does not match", () => {
    const duringDate = new Date(2016, FEB, 15);
    const timeline = { timeDefined: true, startDate, endDate,
      recurrenceType: "Weekly", recurrenceFrequency: 3 };

    assert.equal(scheduleParser.canPlay(timeline, duringDate), false);
  });

  it("it cannot play if weekly day recurrence does not match", () => {
    const duringDate = new Date(2016, FEB, 15);
    const timeline = { timeDefined: true, startDate, endDate,
      recurrenceType: "Weekly", recurrenceFrequency: 2, recurrenceDaysOfWeek: "Sun,Wed,Thu" };

    assert.equal(scheduleParser.canPlay(timeline, duringDate), false);
  });

  it("it cannot play if weekly day recurrence does not match", () => {
    const duringDate = new Date(2016, FEB, 15);
    const timeline = { timeDefined: true, startDate, endDate,
      recurrenceType: "Weekly", recurrenceFrequency: 2, recurrenceDaysOfWeek: ["Sun", "Wed", "Thu"] };

    assert.equal(scheduleParser.canPlay(timeline, duringDate), false);
  });

  it("it can play if absolute monthly recurrence matches", () => {
    const duringDate = new Date(2016, APR, 4);
    const timeline = { timeDefined: true, startDate, endDate,
      recurrenceType: "Monthly", recurrenceAbsolute: true, recurrenceFrequency: 2, recurrenceDayOfMonth: 4 };

    assert.equal(scheduleParser.canPlay(timeline, duringDate), true);
  });

  it("it cannot play if absolute monthly recurrence does not match", () => {
    const duringDate = new Date(2016, APR, 4);
    const timeline = { timeDefined: true, startDate, endDate,
      recurrenceType: "Monthly", recurrenceAbsolute: true, recurrenceFrequency: 3, recurrenceDayOfMonth: 4 };

    assert.equal(scheduleParser.canPlay(timeline, duringDate), false);
  });

  it("it cannot play if absolute monthly day recurrence does not match", () => {
    const duringDate = new Date(2016, APR, 4);
    const timeline = { timeDefined: true, startDate, endDate,
      recurrenceType: "Monthly", recurrenceAbsolute: true, recurrenceFrequency: 2, recurrenceDayOfMonth: 3 };

    assert.equal(scheduleParser.canPlay(timeline, duringDate), false);
  });

  it("it can play if monthly recurrence matches", () => {
    const duringDate = new Date(2016, APR, 11);
    const timeline = { timeDefined: true, startDate, endDate,
      recurrenceType: "Monthly", recurrenceFrequency: 2, recurrenceDayOfWeek: 1, recurrenceWeekOfMonth: 1 };

    assert.equal(scheduleParser.canPlay(timeline, duringDate), true);
  });

  it("it cannot play if monthly day recurrence does not match", () => {
    const duringDate = new Date(2016, APR, 4);
    const timeline = { timeDefined: true, startDate, endDate,
      recurrenceType: "Monthly", recurrenceFrequency: 3, recurrenceDayOfWeek: 1 };

    assert.equal(scheduleParser.canPlay(timeline, duringDate), false);
  });

  it("it cannot play if monthly weekday recurrence does not match", () => {
    const duringDate = new Date(2016, APR, 4);
    const timeline = { timeDefined: true, startDate, endDate,
      recurrenceType: "Monthly", recurrenceFrequency: 2, recurrenceDayOfWeek: 2 };

    assert.equal(scheduleParser.canPlay(timeline, duringDate), false);
  });

  it("it cannot play if monthly last week of month recurrence does not match", () => {
    const duringDate = new Date(2016, APR, 4);
    const timeline = { timeDefined: true, startDate, endDate,
      recurrenceType: "Monthly", recurrenceFrequency: 2, recurrenceDayOfWeek: 1, recurrenceWeekOfMonth: 4 };

    assert.equal(scheduleParser.canPlay(timeline, duringDate), false);
  });

  it("it cannot play if monthly week of month recurrence does not match", () => {
    const duringDate = new Date(2016, APR, 11);
    const timeline = { timeDefined: true, startDate, endDate,
      recurrenceType: "Monthly", recurrenceFrequency: 2, recurrenceDayOfWeek: 1, recurrenceWeekOfMonth: 2 };

    assert.equal(scheduleParser.canPlay(timeline, duringDate), false);
  });

  it("it can play if absolute yearly recurrence matches", () => {
    const endDate = new Date(2018, JUN, 30);
    const recurrenceDate = new Date(2017, APR, 4);
    const timeline = { timeDefined: true, startDate, endDate,
      recurrenceType: "Yearly", recurrenceAbsolute: true, recurrenceMonthOfYear: APR, recurrenceDayOfMonth: 4 };

    assert.equal(scheduleParser.canPlay(timeline, recurrenceDate), true);
  });

  it("it cannot play if absolute yearly recurrence does not match", () => {
    const endDate = new Date(2018, JUN, 30);
    const diffDayDate = new Date(2017, APR, 7);
    const diffMonthDate = new Date(2017, JUN, 4);
    const timeline = { timeDefined: true, startDate, endDate,
      recurrenceType: "Yearly", recurrenceAbsolute: true, recurrenceMonthOfYear: APR, recurrenceDayOfMonth: 4 };

    assert.equal(scheduleParser.canPlay(timeline, diffDayDate), false);
    assert.equal(scheduleParser.canPlay(timeline, diffMonthDate), false);
  });

  it("it can play if yearly recurrence matches", () => {
    const endDate = new Date(2018, JUN, 30);
    const recurrenceDate = new Date(2017, APR, 11);
    const timeline = { timeDefined: true, startDate, endDate,
      recurrenceType: "Yearly", recurrenceMonthOfYear: APR, recurrenceDayOfWeek: 2, recurrenceWeekOfMonth: 1 };

    assert.equal(scheduleParser.canPlay(timeline, recurrenceDate), true);
  });

  it("it cannot play if yearly weekday+month recurrence does not match", () => {
    const endDate = new Date(2018, JUN, 30);
    const diffDayDate = new Date(2017, APR, 7);
    const diffMonthDate = new Date(2017, JUN, 6);
    const timeline = { timeDefined: true, startDate, endDate,
      recurrenceType: "Yearly", recurrenceMonthOfYear: APR, recurrenceDayOfWeek: 2 };

    assert.equal(scheduleParser.canPlay(timeline, diffDayDate), false);
    assert.equal(scheduleParser.canPlay(timeline, diffMonthDate), false);
  });

  it("it cannot play if yearly last week of month recurrence does not match", () => {
    const endDate = new Date(2018, JUN, 30);
    const testDate = new Date(2017, APR, 18);
    const timeline = { timeDefined: true, startDate, endDate,
      recurrenceType: "Yearly", recurrenceMonthOfYear: APR, recurrenceDayOfWeek: 2, recurrenceWeekOfMonth: 4 };

    assert.equal(scheduleParser.canPlay(timeline, testDate), false);
  });

  it("it cannot play if yearly week of month recurrence does not match", () => {
    const endDate = new Date(2018, JUN, 30);
    const testDate = new Date(2017, APR, 11);
    const timeline = { timeDefined: true, startDate, endDate,
      recurrenceType: "Yearly", recurrenceMonthOfYear: APR, recurrenceDayOfWeek: 2, recurrenceWeekOfMonth: 2 };

    assert.equal(scheduleParser.canPlay(timeline, testDate), false);
  });
});
