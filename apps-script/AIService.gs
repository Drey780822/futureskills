/**
 * AIService.gs
 * -----------------------------------------------------------------------------
 * AI-ready placeholder architecture. Wire your provider (Vertex AI, OpenAI via
 * UrlFetchApp, PaLM) inside these functions — the rest of the app already
 * consumes their outputs.
 *
 * All functions are SAFE-BY-DEFAULT: if the AI provider is unavailable, they
 * return a graceful fallback so the UI still renders.
 * -----------------------------------------------------------------------------
 */

const AIService = (function () {

  /** #1 Automatic response summary — top themes / takeaways / opinions. */
  function summarizeResponses(activityId) {
    const rows = Database.findMany(CONFIG.SHEETS.RESPONSES, { activityId: activityId });
    if (!rows.length) return { themes: [], takeaways: [], topics: [] };

    // TODO: plug your LLM here. Example scaffold (kept commented so the app
    // works out-of-the-box without an API key):
    //
    //   const key = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
    //   const res = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
    //     method: 'post', contentType: 'application/json',
    //     headers: { Authorization: 'Bearer ' + key },
    //     payload: JSON.stringify({ model: 'gpt-4o-mini', messages: [...] })
    //   });
    //   return JSON.parse(res.getContentText());

    // Fallback: naive keyword frequency so the panel still renders in demos.
    const words = {};
    rows.forEach(function (r) {
      const p = Helpers.safeParse(r.payload, {});
      String(p.text || '').toLowerCase().split(/\W+/).forEach(function (w) {
        if (w.length > 4) words[w] = (words[w] || 0) + 1;
      });
    });
    const topics = Object.keys(words)
      .sort(function (a, b) { return words[b] - words[a]; })
      .slice(0, 6)
      .map(function (w) { return { topic: w, count: words[w] }; });
    return {
      themes: topics.slice(0, 3).map(function (t) { return 'Discussion of ' + t.topic; }),
      takeaways: ['Class shows strong engagement.', 'Themes converge on core concepts.'],
      topics: topics
    };
  }

  /** #2 Sentiment: positive / neutral / negative distribution. */
  function sentimentBreakdown(activityId) {
    const rows = Database.findMany(CONFIG.SHEETS.RESPONSES, { activityId: activityId });
    const buckets = { positive: 0, neutral: 0, negative: 0 };
    const POS = /good|great|love|excellent|clear|helpful|enjoy|awesome/i;
    const NEG = /bad|hate|confus|difficult|unclear|poor|hard|boring/i;
    rows.forEach(function (r) {
      const t = String(Helpers.safeParse(r.payload, {}).text || '');
      if (POS.test(t)) buckets.positive++;
      else if (NEG.test(t)) buckets.negative++;
      else buckets.neutral++;
    });
    return buckets;
  }

  /** #3 At-risk detection: low participation, missed activities, late submissions. */
  function detectAtRiskStudents(courseId) {
    const acts = Database.findMany(CONFIG.SHEETS.ACTIVITIES, { courseId: courseId });
    const actIds = acts.map(function (a) { return a.id; });
    const responses = Database.findMany(CONFIG.SHEETS.RESPONSES, {})
      .filter(function (r) { return actIds.indexOf(r.activityId) !== -1; });

    const byStudent = {};
    responses.forEach(function (r) {
      byStudent[r.studentId] = byStudent[r.studentId] || {
        studentId: r.studentId,
        name: r.studentName || 'Anonymous',
        responses: 0,
        lastActive: r.createdAt
      };
      byStudent[r.studentId].responses++;
      if (String(r.createdAt) > String(byStudent[r.studentId].lastActive)) {
        byStudent[r.studentId].lastActive = r.createdAt;
      }
    });

    const total = acts.length || 1;
    return Object.keys(byStudent).map(function (k) {
      const s = byStudent[k];
      const participation = s.responses / total;
      const daysSince = Helpers.daysAgo(s.lastActive);
      const atRisk = participation < 0.4 || daysSince > 7;
      return Object.assign(s, {
        participation: Math.round(participation * 100),
        daysSince: daysSince,
        atRisk: atRisk
      });
    }).filter(function (s) { return s.atRisk; });
  }

  /** Called after each response — placeholder for background enrichment. */
  function enrichResponseAsync(_responseId) { /* wire your queue here */ }

  return { summarizeResponses, sentimentBreakdown, detectAtRiskStudents, enrichResponseAsync };
})();
