/**
 * SeedData.gs
 * -----------------------------------------------------------------------------
 * Populates the workbook with realistic South African university demo data
 * so judges can click through the entire product on first run.
 * -----------------------------------------------------------------------------
 */

const SeedData = (function () {

  function seedAll() {
    Database.initDatabase();
    const email = Session.getActiveUser().getEmail() || 'demo@futureskills.ac.za';

    const course = CourseService.createCourse({
      name: 'Introduction to Data Science',
      code: 'DSC101',
      description: 'A first-year introduction to data thinking, Python, and applied analytics for the modern South African economy.',
      semester: '2026 · Semester 1'
    });

    const q = ActivityService.createActivity({
      courseId: course.id, type: CONFIG.ACTIVITY_TYPES.QUESTION,
      moduleNumber: 1, sessionName: 'Session 1 — Why Data?',
      title: 'What problem in South Africa could data science help solve?',
      body: 'Share one specific idea in 2–3 sentences. Be concrete.',
      tags: ['reflection', 'south africa', 'week 1'],
      difficulty: 'easy', estMinutes: 5, visibility: 'course',
      settings: {
        anonymous: false, requireName: true,
        enableLikes: true, enableDislikes: true, enableComments: true,
        enableAISummary: true, pinned: true,
      }
    });

    const cl = ActivityService.createActivity({
      courseId: course.id, type: CONFIG.ACTIVITY_TYPES.CHECKLIST,
      moduleNumber: 2, sessionName: 'Session 2 — Python Setup',
      title: 'Environment setup checklist',
      body: 'Complete each item to confirm your dev environment is ready.',
      tags: ['setup'], difficulty: 'easy', estMinutes: 10,
      settings: { anonymous: false, comparison: true, enableLikes: true },
      checklistItems: [
        { label: 'Install Python 3.11+',            icon: 'terminal', color: '#6366f1' },
        { label: 'Install VS Code',                 icon: 'code',     color: '#0ea5e9' },
        { label: 'Create a virtual environment',    icon: 'inventory_2', color: '#10b981' },
        { label: 'Install NumPy, Pandas, Matplotlib', icon: 'analytics', color: '#f59e0b' },
        { label: 'Run "hello world" successfully',  icon: 'check_circle', color: '#22c55e' },
      ]
    });

    // Fake responses
    const students = [
      { id: 'stu-001', name: 'Thandi M.',   num: 'DSC-24001' },
      { id: 'stu-002', name: 'Sipho N.',    num: 'DSC-24002' },
      { id: 'stu-003', name: 'Ayesha K.',   num: 'DSC-24003' },
      { id: 'stu-004', name: 'Jaco V.',     num: 'DSC-24004' },
      { id: 'stu-005', name: 'Lerato D.',   num: 'DSC-24005' },
    ];
    const answers = [
      'Data science could help predict water shortages in Cape Town by modelling reservoir levels.',
      'Optimising minibus taxi routes in Johannesburg using GPS data.',
      'Detecting electricity theft on the Eskom grid via anomaly detection.',
      'Forecasting maize yields to protect small farmers from climate shocks.',
      'Fighting online fraud in mobile money transactions.'
    ];
    students.forEach(function (s, i) {
      ResponseService.submitResponse({
        activityId: q.id, studentId: s.id, studentName: s.name, studentNumber: s.num,
        payload: { text: answers[i] }
      });
      ResponseService.submitResponse({
        activityId: cl.id, studentId: s.id, studentName: s.name, studentNumber: s.num,
        payload: { checkedItemIds: cl.checklistItems.slice(0, 3 + (i % 3)).map(function (x) { return x.id; }),
                   score: Math.min(100, 60 + i * 8) }
      });
      ResponseService.toggleLike({ targetType: 'activity', targetId: q.id, actorId: s.id, value: 1 });
    });

    ResponseService.addComment({
      activityId: q.id, authorId: email, authorName: 'Lecturer',
      authorRole: 'lecturer', body: 'Great range of ideas — let\'s dig into water demand next week.',
      pinned: true
    });

    return { courseId: course.id, activities: [q.id, cl.id] };
  }

  return { seedAll };
})();
