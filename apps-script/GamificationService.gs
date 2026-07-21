/**
 * GamificationService.gs
 * -----------------------------------------------------------------------------
 * XP, streaks, badges, anonymous leaderboard.
 *
 * WHY this exists:
 *   Engagement in online learning collapses when there is no feedback loop.
 *   Adding lightweight, non-competitive gamification (XP + streaks + private
 *   leaderboard) has been shown in EdTech studies to raise weekly return
 *   rates 20-40%. Everything is anonymous by default — students see their
 *   own progress and their rank on an anonymous board (no PII exposed).
 * -----------------------------------------------------------------------------
 */

const GamificationService = (function () {

  function _get(studentId) {
    let g = Database.findOne(CONFIG.SHEETS.GAMIFICATION, { studentId: studentId });
    if (!g) {
      g = { id: Helpers.uuid(), studentId: studentId, xp: 0, streak: 0,
            lastActive: '', badges: '[]', createdBy: studentId };
      Database.insert(CONFIG.SHEETS.GAMIFICATION, g);
    }
    return g;
  }

  function awardForResponse(studentId, activityType) {
    if (!CONFIG.FEATURES.GAMIFICATION) return null;
    const g = _get(studentId);
    const today = new Date().toISOString().slice(0, 10);
    const last = String(g.lastActive || '').slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    const gain = activityType === CONFIG.ACTIVITY_TYPES.CHECKLIST
      ? CONFIG.XP.CHECKLIST_COMPLETE : CONFIG.XP.RESPONSE;
    const streak = (last === today) ? g.streak
                    : (last === yesterday ? g.streak + 1 : 1);

    const badges = Helpers.safeParse(g.badges, []);
    function grant(id) { if (badges.indexOf(id) === -1) badges.push(id); }
    if (Number(g.xp) === 0) grant('first_step');
    if (streak >= 7)  grant('streak_7');
    if (streak >= 30) grant('streak_30');

    Database.update(CONFIG.SHEETS.GAMIFICATION, g.id, {
      xp: Number(g.xp) + gain, streak: streak,
      lastActive: Helpers.nowIso(), badges: JSON.stringify(badges)
    });
    return { xpGained: gain, streak: streak, badges: badges };
  }

  function leaderboard(courseId) {
    const acts = Database.findMany(CONFIG.SHEETS.ACTIVITIES, { courseId: courseId });
    const ids = acts.map(function (a) { return a.id; });
    const studentIds = {};
    Database.findMany(CONFIG.SHEETS.RESPONSES, {}).forEach(function (r) {
      if (ids.indexOf(r.activityId) !== -1) studentIds[r.studentId] = true;
    });
    const rows = Object.keys(studentIds).map(function (sid) {
      const g = _get(sid);
      return {
        anonId: sid.slice(0, 6).toUpperCase(),
        xp: Number(g.xp),
        streak: Number(g.streak),
        badges: Helpers.safeParse(g.badges, []).length
      };
    }).sort(function (a, b) { return b.xp - a.xp; });
    return rows.slice(0, 20);
  }

  function myProgress(studentId) {
    const g = _get(studentId);
    return {
      xp: Number(g.xp), streak: Number(g.streak),
      badges: Helpers.safeParse(g.badges, []),
      nextBadge: CONFIG.BADGES[0]
    };
  }

  return { awardForResponse, leaderboard, myProgress };
})();
