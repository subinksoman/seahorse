/**
 * Licensed under the Apache License, Version 2.0 (the "License").
 * http://www.apache.org/licenses/LICENSE-2.0
 */

const config = require('../config/config');

const contextPath = config.contextPath;

/**
 * Prefix a root-absolute path with the context path. Idempotent, and leaves relative,
 * protocol-relative and absolute URLs alone.
 */
function withContextPath(target) {
  if (!contextPath || typeof target !== 'string') {
    return target;
  }
  if (target.charAt(0) !== '/' || target.charAt(1) === '/') {
    return target;
  }
  if (target === contextPath || target.indexOf(contextPath + '/') === 0) {
    return target;
  }
  return contextPath + target;
}

/**
 * Strip the context path off an incoming path. Used on the WebSocket upgrade, which never reaches
 * the express middleware chain.
 */
function stripContextPath(url) {
  if (!contextPath || typeof url !== 'string' || url.indexOf(contextPath + '/') !== 0) {
    return url;
  }
  return url.slice(contextPath.length);
}

/**
 * Expire a cookie at the mount point and at the root: deployments that previously ran without a
 * context path left cookies at '/', and those are still sent here.
 */
function clearSessionCookies(res, name) {
  res.clearCookie(name, { path: config.cookiePath });
  if (config.cookiePath !== '/') {
    res.clearCookie(name, { path: '/' });
  }
}

module.exports = { contextPath, withContextPath, stripContextPath, clearSessionCookies };
