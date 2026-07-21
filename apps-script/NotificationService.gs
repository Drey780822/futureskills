/**
 * NotificationService.gs
 * -----------------------------------------------------------------------------
 * In-app notifications + announcements + pinned lecturer messages.
 * (Email delivery is intentionally NOT wired — swap in MailApp.sendEmail
 * behind a feature flag when needed.)
 * -----------------------------------------------------------------------------
 */

const NotificationService = (function () {

  function push(toUser, payload) {
    if (!CONFIG.FEATURES.NOTIFICATIONS) return;
    Database.insert(CONFIG.SHEETS.NOTIFICATIONS, {
      id: Helpers.uuid(),
      toUser: toUser,
      kind: payload.kind || 'info',
      title: payload.title || '',
      body: payload.body || '',
      link: payload.link || '',
      read: false,
      createdBy: 'system'
    });
  }

  function inbox() {
    const user = Auth.getCurrentUser();
    return Database.findMany(CONFIG.SHEETS.NOTIFICATIONS, { toUser: user.email }, {
      sort: 'createdAt', desc: true, limit: 50
    });
  }

  function markRead(id) {
    return Database.update(CONFIG.SHEETS.NOTIFICATIONS, id, { read: true });
  }

  function announce(courseId, title, body) {
    const user = Auth.getCurrentUser();
    push(user.email, {
      kind: 'announcement', title: title, body: body,
      link: '?view=lecturer&courseId=' + courseId
    });
    // Fan-out to any student who has responded in this course.
    const acts = Database.findMany(CONFIG.SHEETS.ACTIVITIES, { courseId: courseId });
    const students = {};
    acts.forEach(function (a) {
      Database.findMany(CONFIG.SHEETS.RESPONSES, { activityId: a.id }).forEach(function (r) {
        students[r.studentId] = true;
      });
    });
    Object.keys(students).forEach(function (sid) {
      push(sid, { kind: 'announcement', title: title, body: body });
    });
  }

  return { push, inbox, markRead, announce };
})();
