/**
 * Auth.gs
 * -----------------------------------------------------------------------------
 * Google authentication + session context + owner verification.
 *
 * Apps Script handles the Google login automatically — Session.getActiveUser()
 * returns the signed-in user. We layer role/owner checks on top.
 * -----------------------------------------------------------------------------
 */

const Auth = (function () {

  /** Return { email, name, picture, role } for the current lecturer. */
  function getCurrentUser() {
    const email = Session.getActiveUser().getEmail()
      || Session.getEffectiveUser().getEmail()
      || '';
    if (!email) {
      return { email: '', name: 'Guest', role: 'guest', authenticated: false };
    }

    let user = Database.findOne(CONFIG.SHEETS.USERS, { email: email });
    if (!user) {
      // Auto-provision the lecturer on first login.
      user = {
        id: Helpers.uuid(),
        email: email,
        name: email.split('@')[0],
        role: 'lecturer',
        picture: '',
        createdAt: Helpers.nowIso(),
        updatedAt: Helpers.nowIso(),
        createdBy: email,
        status: 'active',
      };
      Database.insert(CONFIG.SHEETS.USERS, user);
      AuditLog.write('user.provisioned', email, { userId: user.id });
    }
    user.authenticated = true;
    return user;
  }

  /** Assert the caller owns the resource, or throw. */
  function requireOwner(resource) {
    const email = Session.getActiveUser().getEmail();
    if (!email) throw new Error('Not authenticated');
    if (resource && resource.createdBy && resource.createdBy !== email) {
      throw new Error('Forbidden: you do not own this resource');
    }
    return email;
  }

  /** Simple in-memory rate limit using CacheService (per-user, per-minute). */
  function checkRateLimit(action) {
    const email = Session.getActiveUser().getEmail() || 'anon';
    const key = 'rl:' + email + ':' + action + ':' + Math.floor(Date.now() / 60000);
    const cache = CacheService.getUserCache();
    const count = Number(cache.get(key) || 0) + 1;
    cache.put(key, String(count), 65);
    if (count > CONFIG.RATE_LIMIT_WRITES_PER_MIN) {
      throw new Error('Rate limit exceeded — slow down and try again shortly.');
    }
  }

  /** Auth status for the friendly sign-in screen. */
  function getAuthStatus() {
    const email = Session.getActiveUser().getEmail()
      || Session.getEffectiveUser().getEmail()
      || '';
    return {
      authenticated: !!email,
      email: email,
      appName: CONFIG.APP_NAME,
      org: CONFIG.ORG,
      scopes: [
        { id: 'email', label: 'Your Google email', reason: 'Identify you as the course owner' },
        { id: 'sheets', label: 'Google Sheets', reason: 'Store courses, activities, and student responses' },
      ],
    };
  }

  /** Ping used to trigger OAuth consent on first lecturer sign-in. */
  function ping() {
    const email = Session.getActiveUser().getEmail()
      || Session.getEffectiveUser().getEmail()
      || '';
    if (!email) {
      throw new Error('Sign in required — open this app while logged into your Google account, then try again.');
    }
    return { email: email, user: getCurrentUser() };
  }

  return { getCurrentUser, getAuthStatus, ping, requireOwner, checkRateLimit };
})();

/** Convenient audit log writer used across services. */
const AuditLog = {
  write: function (action, actor, meta) {
    try {
      Database.insert(CONFIG.SHEETS.AUDIT_LOGS, {
        id: Helpers.uuid(),
        action: action,
        actor: actor || '',
        meta: JSON.stringify(meta || {}),
        createdAt: Helpers.nowIso(),
      });
    } catch (e) { /* audit must never break the app */ }
  }
};
