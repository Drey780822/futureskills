/**
 * AnalyticsService.gs
 * -----------------------------------------------------------------------------
 * Aggregations for the lecturer analytics dashboard. All heavy work is done
 * in-memory over the small set of Sheet rows — cached per-course for 60s.
 * -----------------------------------------------------------------------------
 */

const AnalyticsService = (function () {

  function courseAnalytics(courseId) {
    const cache = CacheService.getScriptCache();
    const key = 'ana:' + courseId;
    const hit = cache.get(key);
    if (hit) return JSON.parse(hit);

    const activities = Database.findMany(CONFIG.SHEETS.ACTIVITIES, { courseId: courseId });
    const actIds = activities.map(function (a) { return a.id; });
    const responses = Database.findMany(CONFIG.SHEETS.RESPONSES, {})
      .filter(function (r) { return actIds.indexOf(r.activityId) !== -1; });
    const likes = Database.findMany(CONFIG.SHEETS.LIKES, {})
      .filter(function (l) { return actIds.indexOf(l.targetId) !== -1; });

    // Time series (last 14 days)
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    const series = days.map(function (day) {
      return {
        day: day,
        responses: responses.filter(function (r) { return String(r.createdAt).slice(0, 10) === day; }).length
      };
    });

    // Per-activity metrics
    const perActivity = activities.map(function (a) {
      const rs = responses.filter(function (r) { return r.activityId === a.id; });
      const ls = likes.filter(function (l) { return l.targetId === a.id; });
      return {
        id: a.id, title: a.title, type: a.type, module: a.moduleNumber,
        responses: rs.length,
        likes: ls.filter(function (l) { return l.value === 1; }).length,
        dislikes: ls.filter(function (l) { return l.value === -1; }).length,
      };
    });

    const totalStudents = new Set(responses.map(function (r) { return r.studentId; })).size;

    const out = {
      totals: {
        activities: activities.length,
        responses: responses.length,
        likes: likes.filter(function (l) { return l.value === 1; }).length,
        dislikes: likes.filter(function (l) { return l.value === -1; }).length,
        students: totalStudents,
        participation: activities.length && totalStudents
          ? Math.round((responses.length / (activities.length * Math.max(totalStudents, 1))) * 100)
          : 0
      },
      series: series,
      perActivity: perActivity,
      topPopular: perActivity.slice().sort(function (a, b) { return b.responses - a.responses; }).slice(0, 5),
      topDifficult: perActivity.slice().sort(function (a, b) { return b.dislikes - a.dislikes; }).slice(0, 5),
      atRiskStudents: AIService.detectAtRiskStudents(courseId), // AI hook
    };

    cache.put(key, JSON.stringify(out), CONFIG.CACHE_TTL_SHORT);
    return out;
  }

  function globalStats() {
    const user = Auth.getCurrentUser();
    const courses = Database.findMany(CONFIG.SHEETS.COURSES, { createdBy: user.email });
    const courseIds = courses.map(function (c) { return c.id; });
    const activities = Database.findMany(CONFIG.SHEETS.ACTIVITIES, {})
      .filter(function (a) { return courseIds.indexOf(a.courseId) !== -1; });
    const actIds = activities.map(function (a) { return a.id; });
    const responses = Database.findMany(CONFIG.SHEETS.RESPONSES, {})
      .filter(function (r) { return actIds.indexOf(r.activityId) !== -1; });
    const likes = Database.findMany(CONFIG.SHEETS.LIKES, {})
      .filter(function (l) { return actIds.indexOf(l.targetId) !== -1 && l.value === 1; });

    return {
      courses: courses.length,
      activities: activities.length,
      responses: responses.length,
      engagement: activities.length
        ? Math.round(((responses.length + likes.length) / activities.length) * 10) / 10
        : 0,
      recent: responses.sort(function (a, b) {
        return String(b.createdAt).localeCompare(String(a.createdAt));
      }).slice(0, 8)
    };
  }

  return { courseAnalytics, globalStats };
})();
