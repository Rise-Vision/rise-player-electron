Scheduling
==========

Displays can be configured to show multiple web pages, each on a different schedule. In addition, the overall display has its own schedule, the primary schedule. So, for example a display can be scheduled to be on schedule 9-5 Mon-Fri, while each of three web pages to be shown are scheduled for 8am-11am, 12pm-2pm, and 4pm-6pm, respectively. The overall display schedule takes precedence, so in this example, the last hour of the last schedule is not going to be shown.

Here's a representation of the example:

  0. Mon-Fri 9am-5pm
   1. Mon-Fri 8am-11am http://www.cnn.com
   2. Mon-Fri 12pm-2pm http://www.foxnews.com
   3. Mon-Fri 4pm-6pm http://www.msnbc.com

Scheduling is further complicated by the myriad options available within each schedule. Mon-Fri 9am-5pm is a simple case, but the user interface offers flexibility to specify more detailed schedules. For example:

> Starting on November 2nd, 2018, until April 7th, 2019, during the hours of 8am and 10pm, on the first Monday of every 2nd month

> Starting on December 2nd, 2018, until January 7th, 2019, during the hours of 8am and 10pm, every 2 weeks, on Mondays, Tuesdays, and Fridays

The following strategy is used to handle scheduling:

 1. At startup, check the primary schedule and all url schedules and begin showing the appropriate sites.
 2. Examine each schedule to see whether there is a change during the day, for example if it is 6am now and an item is scheduled to start at 6:30am, a re-check timer for 1,800,000 milliseconds should be set. A timer need not be set for multiple schedules, only the most immediate one is set.
 3. If no time-based change is found for the current day, set a re-check timer for the start of the next day. This will take into account any schedules that might not be showing today, but are scheduled to show on some other day.
 4. If item is set to play until done, a 1 second timer is set to re-check until the 'template-done' event is received.

During any re-check, if a currently playing item is still scheduled to play, it should not be interrupted.
