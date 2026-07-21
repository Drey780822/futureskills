/**
 * Config.gs
 * -----------------------------------------------------------------------------
 * Global configuration for the Interactive Learning Module (ILM).
 * All magic strings live here. Change once, propagate everywhere.
 * -----------------------------------------------------------------------------
 */

const CONFIG = {
  APP_NAME: 'Interactive Learning Module',
  APP_SHORT: 'ILM',
  APP_VERSION: '1.0.0',
  ORG: 'FutureSkills',

  // Spreadsheet name — created automatically by Database.initDatabase() if missing.
  DB_NAME: 'FutureSkills_ILM_DB',

  // Cache TTL (seconds). Used by CacheService for hot reads.
  CACHE_TTL_SHORT: 60,
  CACHE_TTL_MEDIUM: 300,
  CACHE_TTL_LONG: 1800,

  // Rate limit: max writes per user per minute.
  RATE_LIMIT_WRITES_PER_MIN: 60,

  // Pagination defaults
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 200,

  // Feature flags — flip to enable/disable roadmap features safely.
  FEATURES: {
    AI_SUMMARY: true,
    SENTIMENT: true,
    GAMIFICATION: true,
    COMMENTS: true,
    NOTIFICATIONS: true,
  },

  // Property keys
  PROPS: {
    DB_ID: 'ILM_DB_SPREADSHEET_ID',
    INITIALIZED: 'ILM_DB_INITIALIZED',
  },

  // Sheet names (single source of truth)
  SHEETS: {
    USERS: 'Users',
    COURSES: 'Courses',
    MODULES: 'Modules',
    ACTIVITIES: 'Activities',
    CHECKLIST_ITEMS: 'ChecklistItems',
    RESPONSES: 'Responses',
    COMMENTS: 'Comments',
    LIKES: 'Likes',
    NOTIFICATIONS: 'Notifications',
    ANALYTICS: 'Analytics',
    SETTINGS: 'Settings',
    AUDIT_LOGS: 'AuditLogs',
    GAMIFICATION: 'Gamification',
  },

  // Activity types — architecture is data-driven; new types need no schema change.
  ACTIVITY_TYPES: {
    QUESTION: 'question',
    CHECKLIST: 'checklist',
    QUIZ: 'quiz',           // roadmap
    POLL: 'poll',           // roadmap
    REFLECTION: 'reflection', // roadmap
    RATING: 'rating',       // roadmap
    PEER_REVIEW: 'peer_review', // roadmap
    WORD_CLOUD: 'word_cloud',   // roadmap
  },

  // Status enums
  STATUS: {
    DRAFT: 'draft',
    PUBLISHED: 'published',
    ARCHIVED: 'archived',
    DELETED: 'deleted',
  },

  // Gamification tuning
  XP: {
    RESPONSE: 10,
    CHECKLIST_COMPLETE: 25,
    COMMENT: 5,
    LIKE_GIVEN: 1,
    STREAK_DAY: 15,
  },
  BADGES: [
    { id: 'first_step', name: 'First Step', desc: 'Submitted your first response', xp: 10 },
    { id: 'streak_7',   name: 'Consistent',  desc: '7-day learning streak',        xp: 100 },
    { id: 'streak_30',  name: 'Dedicated',   desc: '30-day learning streak',       xp: 500 },
    { id: 'top_10',     name: 'Top 10%',     desc: 'Reached the top 10% this week', xp: 200 },
    { id: 'perfectionist', name: 'Perfectionist', desc: '100% on a checklist',     xp: 50 },
  ],
};
