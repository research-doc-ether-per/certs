// src/middleware/requireScope.js
/**
 * 要求されるスコープをチェック
 * @param {string[]} requiredScopes 
 */
function requireScope(requiredScopes) {
  return (req, res, next) => {
    // Introspection 結果を詰めた req.user を前提にする
    const scopeString = req.user?.scope || '';
    const tokenScopes = scopeString.split(' ');

    const hasAll = requiredScopes.every(s => tokenScopes.includes(s));
    if (!hasAll) {
      return res.status(403).json({ error: 'Insufficient scope' });
    }
    next();
  }
}

module.exports = requireScope;
