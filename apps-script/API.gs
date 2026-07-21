/**
 * API.gs
 * -----------------------------------------------------------------------------
 * Thin, versioned public API — the only functions exposed to google.script.run.
 * Every call is wrapped in `_safe` for uniform error shape + audit logging.
 *
 * Frontend always calls: google.script.run.API_<name>(payload).
 * -----------------------------------------------------------------------------
 */

function _safe(fn) {
  return function (payload) {
    try {
      return { ok: true, data: fn(payload || {}) };
    } catch (err) {
      Helpers.logError('API', err);
      return { ok: false, error: String(err && err.message || err) };
    }
  };
}

// ---------- Bootstrap / session -------------------------------------------
const API_bootstrap        = _safe(function ()   { return { user: Auth.getCurrentUser(), config: {
  activityTypes: CONFIG.ACTIVITY_TYPES, features: CONFIG.FEATURES, appVersion: CONFIG.APP_VERSION
}}; });

// ---------- Courses --------------------------------------------------------
const API_listCourses      = _safe(function ()          { return CourseService.listCourses(); });
const API_getCourse        = _safe(function (p)         { return CourseService.getCourse(p.id); });
const API_createCourse     = _safe(function (p)         { return CourseService.createCourse(p); });
const API_updateCourse     = _safe(function (p)         { return CourseService.updateCourse(p.id, p.patch); });
const API_duplicateCourse  = _safe(function (p)         { return CourseService.duplicateCourse(p.id); });
const API_archiveCourse    = _safe(function (p)         { return CourseService.archiveCourse(p.id); });
const API_deleteCourse     = _safe(function (p)         { return CourseService.deleteCourse(p.id); });

// ---------- Activities -----------------------------------------------------
const API_listActivities   = _safe(function (p)         { return ActivityService.listActivities(p.courseId, p); });
const API_getActivity      = _safe(function (p)         { return ActivityService.getActivity(p.id); });
const API_createActivity   = _safe(function (p)         { return ActivityService.createActivity(p); });
const API_updateActivity   = _safe(function (p)         { return ActivityService.updateActivity(p.id, p.patch); });
const API_duplicateActivity= _safe(function (p)         { return ActivityService.duplicateActivity(p.id); });
const API_deleteActivity   = _safe(function (p)         { return ActivityService.deleteActivity(p.id); });
const API_getEmbedCode     = _safe(function (p)         { return ActivityService.getEmbedCode(p.id); });

// ---------- Student side (called from the iframe) --------------------------
const API_getActivityForStudent = _safe(function (p)    { return ActivityService.getActivityForStudent(p.id); });
const API_submitResponse   = _safe(function (p)         { return ResponseService.submitResponse(p); });
const API_toggleLike       = _safe(function (p)         { return ResponseService.toggleLike(p); });
const API_addComment       = _safe(function (p)         { return ResponseService.addComment(p); });
const API_listComments     = _safe(function (p)         { return ResponseService.listComments(p.activityId); });
const API_getChecklistStats= _safe(function (p)         { return ResponseService.getChecklistStats(p.activityId); });
const API_leaderboard      = _safe(function (p)         { return GamificationService.leaderboard(p.courseId); });
const API_myProgress       = _safe(function (p)         { return GamificationService.myProgress(p.studentId); });

// ---------- Lecturer analytics --------------------------------------------
const API_listResponses    = _safe(function (p)         { return ResponseService.listResponses(p.activityId); });
const API_courseAnalytics  = _safe(function (p)         { return AnalyticsService.courseAnalytics(p.courseId); });
const API_globalStats      = _safe(function ()          { return AnalyticsService.globalStats(); });
const API_aiSummary        = _safe(function (p)         { return AIService.summarizeResponses(p.activityId); });
const API_aiSentiment      = _safe(function (p)         { return AIService.sentimentBreakdown(p.activityId); });

// ---------- Notifications --------------------------------------------------
const API_notifications    = _safe(function ()          { return NotificationService.inbox(); });
const API_markRead         = _safe(function (p)         { return NotificationService.markRead(p.id); });
const API_announce         = _safe(function (p)         { return NotificationService.announce(p.courseId, p.title, p.body); });

// ---------- Admin ----------------------------------------------------------
const API_seedDemo         = _safe(function ()          { return SeedData.seedAll(); });
