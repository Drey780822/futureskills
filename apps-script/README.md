# Interactive Learning Module (ILM)

> Premium, judge-ready educational platform built entirely on **Google Apps Script + Google Sheets + HtmlService**.
> Inspired by Canvas, Notion, Google Classroom, Linear and Stripe Dashboard.

---

## What's inside

```
apps-script/
├─ appsscript.json         Manifest (scopes, webapp config)
├─ Code.gs                 doGet router + include() helper
├─ Config.gs               Every magic string, feature flag, XP rule
├─ Auth.gs                 Google auth, owner checks, rate limiting, audit log
├─ Database.gs             Sheets-as-DB ORM + schema (12 tables)
├─ Helpers.gs              uuid, sanitisation, safe JSON, date helpers
├─ CourseService.gs        Course CRUD + hydration
├─ ActivityService.gs      Type-agnostic activity engine (+ embed code)
├─ ResponseService.gs      Submissions, likes/dislikes, nested comments
├─ AnalyticsService.gs     Dashboards, series, participation, at-risk
├─ NotificationService.gs  In-app inbox, announcements, fan-out
├─ AIService.gs            AI placeholders: summary / sentiment / at-risk
├─ GamificationService.gs  XP, streaks, badges, anonymous leaderboard
├─ SeedData.gs             Realistic ZA university demo dataset
├─ API.gs                  The ONE public surface (safe wrappers)
└─ ui/
   ├─ Index.html           Lecturer dashboard shell
   ├─ Student.html         Responsive iframe view (LMS-embeddable)
   ├─ Styles.html          Tokenised design system (light+dark, glass)
   ├─ Scripts.html         API client, toasts, theme, confetti
   └─ Components.html      All lecturer view logic (App controller)
```

---

## Database schema (Google Sheets)

Workbook name: **FutureSkills_ILM_DB** — auto-created on first request.

| Sheet | Purpose | Notable columns |
|---|---|---|
| Users | Lecturers auto-provisioned on login | email, role, status |
| Courses | Top-level workspace | code, semester, banner |
| Modules | Optional module grouping | courseId, number |
| Activities | Every learning activity (any type) | type, `settings` (JSON) |
| ChecklistItems | Ordered items belonging to a checklist activity | activityId, position |
| Responses | Student submissions | activityId, studentId, `payload` (JSON) |
| Comments | Nested comments (parentId chain) | pinned, authorRole |
| Likes | Likes & dislikes on any target | targetType, targetId, value |
| Notifications | In-app inbox | toUser, kind, read |
| Analytics | Reserved for pre-aggregated metrics | metric, value, day |
| Settings | Per-user preferences | ownerEmail, key/value |
| AuditLogs | Every mutating action | action, actor, meta |
| Gamification | XP, streaks, badges per student | studentId, xp, streak |

Every row has: `id` (PK), `createdAt`, `updatedAt`, `createdBy`, `status`.
Foreign keys are plain string ids, validated in service layers.

### Why a JSON `settings` / `payload` column?
So new activity types (Poll, Quiz, WordCloud, Rating, Peer Review, Reflection) can be added with **zero schema migration** — the `type` field switches behaviour, and `settings`/`payload` shape freely.

---

## Deployment

1. Open [script.google.com](https://script.google.com) → **New project**.
2. Rename to `ILM`. Click **Project Settings** → tick *Show `appsscript.json`*.
3. Replace `appsscript.json` with the file in this folder.
4. Create one `.gs` file for each `*.gs` in this folder and paste the contents.
5. Under **Files → New → HTML**, create `ui/Index`, `ui/Student`, `ui/Styles`, `ui/Scripts`, `ui/Components` (subfolder names are just prefixed to the filename in Apps Script — call them `ui/Index.html` etc.).
6. Click **Deploy → New deployment → Web app**.
   - Execute as: **User accessing the web app** (so Google Auth applies).
   - Who has access: **Anyone with Google account** (or your domain).
7. Open the resulting URL — this is the **lecturer dashboard**.
8. From the sidebar click **Seed demo data** for realistic content.

### Student iframe URL
`YOUR_WEBAPP_URL?view=student&activityId=<ACTIVITY_ID>`

Use the **Copy embed code** button on any activity — the snippet is responsive, auto-resizes via `postMessage`, and works in Canvas, Moodle, Blackboard, Notion, Google Sites and MS Teams.

---

## AI hooks

`AIService.gs` ships graceful fallbacks so the UI renders without a provider key. To wire real AI:

```js
// Config.gs — add
FEATURES.AI_SUMMARY = true;
// Script Properties — add
OPENAI_API_KEY = sk-...
// AIService.summarizeResponses() — uncomment the UrlFetchApp block.
```

Three features are exposed:
1. **Automatic response summary** — top themes, key takeaways, frequent topics.
2. **Sentiment analysis** — positive / neutral / negative breakdown.
3. **At-risk detection** — surfaces students with low participation or long inactivity.

---

## Security

- Google auth via `Session.getActiveUser()`.
- `Auth.requireOwner()` on every mutating call.
- Server-side HTML entity escape via `Helpers.escapeHtml` + recursive `sanitizeObject`.
- Rate limit: 60 writes / user / minute via `CacheService`.
- Every mutating call written to `AuditLogs`.
- Student identity is a locally-generated fingerprint — no PII leaves the device unless the student types it (name/number are optional and never shown on the leaderboard).
- Iframes returned with `XFrameOptionsMode.ALLOWALL` (needed for LMS embedding).

## Performance

- CacheService per hot query (`AnalyticsService.courseAnalytics` cached 60s).
- Batched `getRange().getValues()` reads; `appendRow` / `setValues` writes.
- Pagination-ready (`findMany` supports offset/limit).
- Skeleton loaders everywhere while data streams in.
- Debounced autosave on student answers.

## Accessibility

- Semantic headings, `<nav>`, `<main>`, `<aside>`.
- Focus rings + `outline` preserved via `box-shadow` on focus.
- Colour tokens keep contrast ≥ WCAG AA in both themes.
- Material Icons carry titles/aria-labels on interactive controls.
- Fully keyboard-navigable modals and tabs.

---

## Testing checklist

- [ ] First load auto-creates `FutureSkills_ILM_DB` with 13 sheets and headers.
- [ ] **Seed demo data** creates a course + 2 activities + 5 responses.
- [ ] Dark mode toggles and persists across reloads.
- [ ] Create Course modal validates required fields.
- [ ] Create Activity → Checklist adds drag-reorderable items.
- [ ] Embed code modal copies snippet; iframe auto-resizes host page.
- [ ] Student page prompts for name/number **once**, then never again.
- [ ] Question submission renders success screen.
- [ ] Checklist submission triggers confetti + class stats screen.
- [ ] Analytics tab shows a line chart (responses over time) + sentiment doughnut.
- [ ] Anonymous leaderboard shows short IDs only — no names.
- [ ] Non-owner cannot mutate another lecturer's course (verify via a second account).

---

## Roadmap — supported by current architecture, no schema change needed

Poll · Quiz · Reflection · Rating · Peer Review · Word Cloud · Bookmarks · Recently viewed · Progress timeline · Completion certificates · Weekly challenges.

Add a new `type` to `CONFIG.ACTIVITY_TYPES`, teach the student UI to render it, done.
