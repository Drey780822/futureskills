/**
 * ActivityService.gs
 * -----------------------------------------------------------------------------
 * Activity CRUD. Deliberately type-agnostic: `type` is a string, `settings` is
 * a JSON blob — so adding Poll, Quiz, WordCloud etc. requires ZERO schema
 * changes. Registered types live in CONFIG.ACTIVITY_TYPES.
 * -----------------------------------------------------------------------------
 */

const ActivityService = (function () {

  function listActivities(courseId, opts) {
    opts = opts || {};
    const rows = Database.findMany(CONFIG.SHEETS.ACTIVITIES, { courseId: courseId }, {
      sort: opts.sort || 'moduleNumber', desc: opts.desc === true
    });
    return rows.map(_hydrateActivity);
  }

  function getActivity(id) {
    const a = Database.findOne(CONFIG.SHEETS.ACTIVITIES, { id: id });
    if (!a) throw new Error('Activity not found');
    return _hydrateActivity(a);
  }

  /** PUBLIC: student-facing fetch (no ownership check, sanitised). */
  function getActivityForStudent(id) {
    const a = Database.findOne(CONFIG.SHEETS.ACTIVITIES, { id: id });
    if (!a || a.status === CONFIG.STATUS.DELETED) throw new Error('Activity not available');
    // hide lecturer internals
    const hydrated = _hydrateActivity(a);
    delete hydrated.createdBy;
    return hydrated;
  }

  function createActivity(input) {
    Auth.checkRateLimit('activity.create');
    const user = Auth.getCurrentUser();
    Helpers.requireFields(input, ['courseId', 'type', 'title']);
    const course = Database.findOne(CONFIG.SHEETS.COURSES, { id: input.courseId });
    if (!course) throw new Error('Course not found');
    Auth.requireOwner(course);

    const activity = Helpers.sanitizeObject({
      id: Helpers.uuid(),
      courseId: input.courseId,
      moduleId: input.moduleId || '',
      moduleNumber: input.moduleNumber || 1,
      sessionName: input.sessionName || '',
      type: input.type,
      title: input.title,
      body: input.body || '',
      tags: (input.tags || []).join(','),
      difficulty: input.difficulty || 'medium',
      estMinutes: Number(input.estMinutes || 5),
      visibility: input.visibility || 'course',
      settings: JSON.stringify(input.settings || {}),
      pinned: !!input.pinned,
      scheduledAt: input.scheduledAt || '',
      deadlineAt: input.deadlineAt || '',
      createdBy: user.email,
      status: CONFIG.STATUS.PUBLISHED,
    });
    Database.insert(CONFIG.SHEETS.ACTIVITIES, activity);

    // Type-specific children (checklist items etc.)
    if (input.type === CONFIG.ACTIVITY_TYPES.CHECKLIST && Array.isArray(input.checklistItems)) {
      const items = input.checklistItems.map(function (it, i) {
        return Helpers.sanitizeObject({
          id: Helpers.uuid(), activityId: activity.id, position: i,
          label: it.label, icon: it.icon || 'check_circle',
          color: it.color || '#6366f1', image: it.image || '',
          createdBy: user.email
        });
      });
      Database.bulkInsert(CONFIG.SHEETS.CHECKLIST_ITEMS, items);
    }

    AuditLog.write('activity.create', user.email, { id: activity.id, type: activity.type });
    return _hydrateActivity(activity);
  }

  function updateActivity(id, patch) {
    const a = Database.findOne(CONFIG.SHEETS.ACTIVITIES, { id: id });
    if (!a) throw new Error('Activity not found');
    Auth.requireOwner(a);
    const clean = Helpers.sanitizeObject(patch);
    if (clean.settings && typeof clean.settings === 'object') clean.settings = JSON.stringify(clean.settings);
    if (Array.isArray(clean.tags)) clean.tags = clean.tags.join(',');
    delete clean.id; delete clean.createdBy;
    const updated = Database.update(CONFIG.SHEETS.ACTIVITIES, id, clean);
    AuditLog.write('activity.update', a.createdBy, { id: id });
    return _hydrateActivity(updated);
  }

  function duplicateActivity(id) {
    const a = getActivity(id);
    const copy = createActivity(Object.assign({}, a, {
      title: a.title + ' (Copy)',
      settings: a.settingsParsed,
      tags: (a.tags || '').split(',').filter(Boolean),
      checklistItems: a.checklistItems || []
    }));
    return copy;
  }

  function deleteActivity(id) {
    const a = Database.findOne(CONFIG.SHEETS.ACTIVITIES, { id: id });
    Auth.requireOwner(a);
    AuditLog.write('activity.delete', a.createdBy, { id: id });
    return Database.softDelete(CONFIG.SHEETS.ACTIVITIES, id);
  }

  function _hydrateActivity(a) {
    const settings = Helpers.safeParse(a.settings, {});
    const responses = Database.findMany(CONFIG.SHEETS.RESPONSES, { activityId: a.id });
    const likes = Database.findMany(CONFIG.SHEETS.LIKES, { targetId: a.id, targetType: 'activity' });
    const checklist = a.type === CONFIG.ACTIVITY_TYPES.CHECKLIST
      ? Database.findMany(CONFIG.SHEETS.CHECKLIST_ITEMS, { activityId: a.id }, { sort: 'position' })
      : [];

    const scores = responses.map(function (r) {
      const p = Helpers.safeParse(r.payload, {}); return Number(p.score || 0);
    }).filter(function (n) { return !isNaN(n); });
    const avgScore = scores.length ? scores.reduce(function (s, n) { return s + n; }, 0) / scores.length : 0;

    return Object.assign({}, a, {
      settingsParsed: settings,
      checklistItems: checklist,
      metrics: {
        responses: responses.length,
        likes: likes.filter(function (l) { return l.value === 1; }).length,
        dislikes: likes.filter(function (l) { return l.value === -1; }).length,
        avgScore: Math.round(avgScore * 10) / 10,
      }
    });
  }

  /** Build the responsive embed snippet for LMSes / Notion / Sites. */
  function getEmbedCode(activityId) {
    const url = ScriptApp.getService().getUrl() + '?view=student&activityId=' + encodeURIComponent(activityId);
    return [
      '<iframe',
      '  src="' + url + '"',
      '  style="width:100%;min-height:600px;border:0;border-radius:16px;',
      '         box-shadow:0 10px 30px -10px rgba(0,0,0,.15);"',
      '  allow="clipboard-write; fullscreen"',
      '  loading="lazy"',
      '  title="ILM Activity"></iframe>',
      '<script>',
      '  window.addEventListener("message", function(e){',
      '    if(e.data && e.data.type==="ilm:resize"){',
      '      var f=document.querySelector(\'iframe[src*="activityId=' + activityId + '"]\');',
      '      if(f) f.style.height = e.data.height + "px";',
      '    }',
      '  });',
      '</script>'
    ].join('\n');
  }

  return {
    listActivities, getActivity, getActivityForStudent,
    createActivity, updateActivity, duplicateActivity, deleteActivity,
    getEmbedCode
  };
})();
