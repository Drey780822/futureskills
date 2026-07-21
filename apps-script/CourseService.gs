/**
 * CourseService.gs
 * -----------------------------------------------------------------------------
 * CRUD + aggregations for courses. Every mutating call verifies ownership.
 * -----------------------------------------------------------------------------
 */

const CourseService = (function () {

  function listCourses(opts) {
    const user = Auth.getCurrentUser();
    const rows = Database.findMany(CONFIG.SHEETS.COURSES, { createdBy: user.email }, {
      sort: 'updatedAt', desc: true
    });
    return rows.map(_hydrateCourse);
  }

  function getCourse(id) {
    const c = Database.findOne(CONFIG.SHEETS.COURSES, { id: id });
    if (!c) throw new Error('Course not found');
    Auth.requireOwner(c);
    return _hydrateCourse(c);
  }

  function createCourse(input) {
    Auth.checkRateLimit('course.create');
    const user = Auth.getCurrentUser();
    Helpers.requireFields(input, ['name', 'code']);
    const course = Helpers.sanitizeObject({
      id: Helpers.uuid(),
      name: input.name,
      code: input.code,
      description: input.description || '',
      semester: input.semester || '',
      banner: input.banner || '',
      createdBy: user.email,
      status: CONFIG.STATUS.PUBLISHED,
    });
    Database.insert(CONFIG.SHEETS.COURSES, course);
    AuditLog.write('course.create', user.email, { id: course.id });
    return _hydrateCourse(course);
  }

  function updateCourse(id, patch) {
    const c = Database.findOne(CONFIG.SHEETS.COURSES, { id: id });
    if (!c) throw new Error('Course not found');
    Auth.requireOwner(c);
    const clean = Helpers.sanitizeObject(patch);
    delete clean.id; delete clean.createdBy;
    const updated = Database.update(CONFIG.SHEETS.COURSES, id, clean);
    AuditLog.write('course.update', c.createdBy, { id: id, keys: Object.keys(clean) });
    return _hydrateCourse(updated);
  }

  function duplicateCourse(id) {
    const c = getCourse(id);
    const copy = createCourse({
      name: c.name + ' (Copy)', code: c.code + '-copy',
      description: c.description, semester: c.semester, banner: c.banner
    });
    // Duplicate activities under the new course.
    const acts = Database.findMany(CONFIG.SHEETS.ACTIVITIES, { courseId: id });
    acts.forEach(function (a) {
      const clone = Object.assign({}, a, {
        id: Helpers.uuid(), courseId: copy.id,
        createdAt: Helpers.nowIso(), updatedAt: Helpers.nowIso()
      });
      Database.insert(CONFIG.SHEETS.ACTIVITIES, clone);
    });
    return copy;
  }

  function archiveCourse(id) {
    const c = Database.findOne(CONFIG.SHEETS.COURSES, { id: id });
    Auth.requireOwner(c);
    return Database.update(CONFIG.SHEETS.COURSES, id, { status: CONFIG.STATUS.ARCHIVED });
  }

  function deleteCourse(id) {
    const c = Database.findOne(CONFIG.SHEETS.COURSES, { id: id });
    Auth.requireOwner(c);
    AuditLog.write('course.delete', c.createdBy, { id: id });
    return Database.softDelete(CONFIG.SHEETS.COURSES, id);
  }

  function _hydrateCourse(c) {
    const activities = Database.findMany(CONFIG.SHEETS.ACTIVITIES, { courseId: c.id });
    const activityIds = activities.map(function (a) { return a.id; });
    const responses = Database.findMany(CONFIG.SHEETS.RESPONSES, {})
      .filter(function (r) { return activityIds.indexOf(r.activityId) !== -1; });
    const likes = Database.findMany(CONFIG.SHEETS.LIKES, {})
      .filter(function (l) { return activityIds.indexOf(l.targetId) !== -1 && l.value === 1; });

    const modules = {};
    activities.forEach(function (a) { modules[a.moduleNumber || 1] = true; });

    return Object.assign({}, c, {
      stats: {
        modules: Object.keys(modules).length,
        activities: activities.length,
        responses: responses.length,
        engagement: activities.length
          ? Math.round((responses.length + likes.length) / activities.length * 10) / 10
          : 0,
      }
    });
  }

  return {
    listCourses, getCourse, createCourse, updateCourse,
    duplicateCourse, archiveCourse, deleteCourse
  };
})();
