/* eslint-disable no-magic-numbers */
const assert = require('assert');
const simple = require('simple-mock');
const commonConfig = require("common-display-module");
const platform = require("rise-common-electron").platform;

const contentComparison = require('../../main/player/content-comparison');

describe('Content Comparison', () => {

  afterEach(() => simple.restore());

  it('should retrieve presentation dates from the content.json format', () => {
    const contentJsonData = {
      content: {
        irrelevantData: "xxx",
        presentations: [
          {
            "id": "pres-test-id-1",
            "changeDate": "test-change-date-1"
          },
          {
            "id": "pres-test-id-2",
            "changeDate": "test-change-date-2"
          }
        ]
      }
    };

    const expectedTransformation = {
      "pres-test-id-1": "test-change-date-1",
      "pres-test-id-2": "test-change-date-2"
    };

    const testResult = contentComparison.getPresDatesFromContent(contentJsonData);
    assert.deepEqual(testResult, expectedTransformation);
  });

  it('should recognize unchanged presentation change dates', () => {
    const newData = {
      content: {
        presentations: [
          {
            "id": "pres-id-1",
            "changeDate": "date-1"
          },
          {
            "id": "pres-id-2",
            "changeDate": "date-2"
          }
        ],
        schedule: {}
      }
    };

    const localData = {
      presDates: {
        "pres-id-1": "date-1",
        "pres-id-2": "date-2"
      }
    };

    simple.mock(commonConfig, 'fileExists').returnWith(true);
    simple.mock(platform, 'readTextFile').resolveWith(JSON.stringify(localData));

    return contentComparison.compareContentData(newData)
    .then(result=>{
      assert(result.aPresentationHasChanged === false);
    });
  });

  it('should recognize changed presentation change dates', () => {
    const newData = {
      content: {
        presentations: [
          {
            "id": "pres-id-1",
            "changeDate": "date-1-new"
          },
          {
            "id": "pres-id-2",
            "changeDate": "date-2"
          }
        ],
        schedule: {}
      }
    };

    const localData = {
      presDates: {
        "pres-id-1": "date-1",
        "pres-id-2": "date-2"
      }
    };

    simple.mock(commonConfig, 'fileExists').returnWith(true);
    simple.mock(platform, 'readTextFile').resolveWith(JSON.stringify(localData));

    return contentComparison.compareContentData(newData)
    .then(result=>{
      assert(result.aPresentationHasChanged === true);
    });
  });

  it('should not indicate change if a presentation has been removed', () => {
    const newData = {
      content: {
        presentations: [
          {
            "id": "pres-id-2",
            "changeDate": "date-2"
          }
        ],
        schedule: {}
      }
    };

    const localData = {
      presDates: {
        "pres-id-1": "date-1",
        "pres-id-2": "date-2"
      }
    };

    simple.mock(commonConfig, 'fileExists').returnWith(true);
    simple.mock(platform, 'readTextFile').resolveWith(JSON.stringify(localData));

    return contentComparison.compareContentData(newData)
    .then(result=>{
      assert(result.aPresentationHasChanged === false);
    });
  });

  it('should recognize unchanged schedule change date', () => {
    const newData = {
      content: {
        presentations: [],
        schedule: {
          "id": "sched-id",
          "changeDate": "sched-date"
        }
      }
    };

    const localData = {
      schedDate: {
        "id": "sched-id",
        "changeDate": "sched-date"
      }
    };

    simple.mock(commonConfig, 'fileExists').returnWith(true);
    simple.mock(platform, 'readTextFile').resolveWith(JSON.stringify(localData));

    return contentComparison.compareContentData(newData)
    .then(result=>{
      assert(result.theScheduleHasChanged === false);
    });
  });

  it('should recognize changed schedule change date', () => {
    const newData = {
      content: {
        presentations: [],
        schedule: {
          "id": "sched-id",
          "changeDate": "sched-date-new"
        }
      }
    };

    const localData = {
      schedDate: {
        "id": "sched-id",
        "changeDate": "sched-date"
      }
    };

    simple.mock(commonConfig, 'fileExists').returnWith(true);
    simple.mock(platform, 'readTextFile').resolveWith(JSON.stringify(localData));

    return contentComparison.compareContentData(newData)
    .then(result=>{
      assert(result.theScheduleHasChanged === true);
    });
  });

  it('should recognize changed schedule id', () => {
    const newData = {
      content: {
        presentations: [],
        schedule: {
          "id": "sched-id-new",
          "changeDate": "sched-date"
        }
      }
    };

    const localData = {
      schedDate: {
        "id": "sched-id",
        "changeDate": "sched-date"
      }
    };

    simple.mock(commonConfig, 'fileExists').returnWith(true);
    simple.mock(platform, 'readTextFile').resolveWith(JSON.stringify(localData));

    return contentComparison.compareContentData(newData)
    .then(result=>{
      assert(result.theScheduleHasChanged === true);
    });
  });

  describe("Content.json data object validation", ()=>{
    it('emptiness', () => {
      return contentComparison.compareContentData().then(() => {
        assert.fail("rejection expected");
      })
      .catch(() => assert.ok(true));
    });

    it('missing content object', () => {
      return contentComparison.compareContentData({}).then(() => {
        assert.fail("rejection expected");
      })
      .catch(() => assert.ok(true));
    });

    it('missing schedule object', () => {
      const data = {
        content: {
          presentations: []
        }
      };
      return contentComparison.compareContentData(data).then(() => {
        assert.fail("rejection expected");
      })
      .catch(() => assert.ok(true));
    });

    it('missing presentation object', () => {
      const data = {
        content: {
          schedule: {}
        }
      };
      return contentComparison.compareContentData(data).then(() => {
        assert.fail("rejection expected");
      })
      .catch(() => assert.ok(true));
    });

    it('should pass without a schedule if default content.json', () => {
      const data = {
        content: {
          presentations: [
            {
              id: "2b95b77e-839c-4674-b020-e2198df49061"
            }
          ]
        }
      };

      return contentComparison.compareContentData(data);
    });

    it('should pass without a presentation if only url items in the schedule', () => {
      const data = {
        content: {
          schedule: {
            items: [
              {
                type: "url"
              }
            ]
          }
        }
      };

      return contentComparison.compareContentData(data);
    });
    it('passing', () => {
      const data = {
        content: {
          schedule: {},
          presentations: []
        }
      };
      return contentComparison.compareContentData(data);
    });
  });

});
