/**
 * Copyright 2016 deepsense.ai (CodiLime, Inc)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const timeout = require('connect-timeout');
const reverseProxy = require('./reverse-proxy');
const config = require('./config/config');

const app = express();

app.use(logger('dev'));
app.use(timeout(config.get('timeout')));
app.use(cookieParser());
app.use(timeoutMiddleware);
app.use(internalErrorMiddleware);
app.use(compression());
app.disable('x-powered-by');

// ALLOWED_DOMAINS lists the origins allowed to embed this app in a frame; '*' (or unset) leaves
// framing unrestricted, as it was before.
// With specific origins listed the app also becomes embed-only: a browser tab pointed straight at it
// is refused, so the only way in is through one of those parents.
const frameAncestors = parseFrameAncestors(config.get('ALLOWED_DOMAINS'));
let noPermissionPage;
if (frameAncestors) {
  console.log('Framing restricted to: ' + frameAncestors + ' (direct access refused)');
  noPermissionPage = renderNoPermissionPage(frameAncestors);
  app.use(frameAncestorsMiddleware);
  app.use(embedOnlyMiddleware);
}

app.use(express.static('app/server/html'));
app.all("/wait.html");

app.all("/authorization/**",
  reverseProxy.forward
);

let auth;
// "true" = UAA OAuth, "sixdee" = portal handoff verified against AUTHORIZATION_HOST; else no-auth stub
const authMode = String(config.get('ENABLE_AUTHORIZATION') || '').toLowerCase();
const authEnabled = authMode === "true" || authMode === "sixdee";
if (authMode === "sixdee") {
  auth = require('./auth/sixdeeauth');
} else if (authMode === "true") {
  auth = require('./auth/auth');
} else {
  auth = require('./auth/stub');
}
auth.init(app);
app.use(auth.login);
if (!authEnabled) {
  app.use(clearStaleSessionCookie);
}
app.use(userCookieMiddleware);

app.get('/', reverseProxy.forward);
app.all('/**', reverseProxy.forward);

function parseFrameAncestors(value) {
  const origins = String(value || '').split(/[\s,]+/).filter((o) => o && o !== '*');
  if (origins.length === 0) {
    return null;
  }
  // 'self' must stay in the list: the notebook modal frames /jupyter from this very origin, and a
  // frame-ancestors listing only the embedder would block it.
  return ["'self'"].concat(origins).join(' ');
}

function frameAncestorsMiddleware(req, res, next) {
  res.setHeader('Content-Security-Policy', 'frame-ancestors ' + frameAncestors);
  next();
}

// frame-ancestors stops other sites from embedding us, but says nothing about someone typing the URL
// into a tab. This refuses that too: only frame/iframe navigations get a document, and everything the
// already-loaded page fetches (scripts, XHR, websockets, downloads) passes through untouched.
function embedOnlyMiddleware(req, res, next) {
  const dest = req.headers['sec-fetch-dest'];
  const navigation = dest ?
    (dest === 'document' || dest === 'iframe' || dest === 'frame') :
    (req.method === 'GET' && String(req.headers.accept || '').indexOf('text/html') !== -1);

  if (!navigation) {
    return next();
  }
  if (dest === 'iframe' || dest === 'frame') {
    // the browser already enforced frame-ancestors before issuing this request
    return next();
  }
  // No Sec-Fetch-Dest (pre-2020 browsers, curl): fall back to the referrer's origin. A framed load
  // carries the parent's origin, a typed URL carries nothing.
  if (!dest && originAllowed(req.headers.referer)) {
    return next();
  }

  console.warn('[embed-only] refused ' + req.method + ' ' + req.url +
    ' (sec-fetch-dest=' + (dest || 'absent') + ', referer=' + (req.headers.referer || 'none') + ')');
  res.status(403).type('html').send(noPermissionPage);
}

function renderNoPermissionPage(ancestors) {
  const origins = ancestors.split(' ').filter((o) => o !== "'self'").join(', ');
  const escaped = origins.replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  return fs.readFileSync(path.join(__dirname, 'html', 'no-permission.html'), 'utf8')
           .replace('{{ALLOWED}}', escaped);
}

function originAllowed(referer) {
  if (!referer) {
    return false;
  }
  let origin;
  try {
    origin = new URL(referer).origin;
  } catch (e) {
    return false;
  }
  return frameAncestors.split(' ').indexOf(origin) !== -1;
}

function clearStaleSessionCookie(req, res, next) {
  // no-auth mode issues no JSESSIONID; clear any left over from a prior real-auth run
  if (req.cookies && req.cookies.JSESSIONID) {
    res.clearCookie('JSESSIONID');
  }
  next();
}

function userCookieMiddleware(req, res, next) {
  if (req.user) {
    res.cookie('seahorse_user', JSON.stringify({
      'id': req.user.user_id,
      'name': req.user.user_name
    }));
  } else {
    res.clearCookie('seahorse_user');
  }
  next();
}

function timeoutMiddleware(req, res, next) {
  if (req.timedout) {
    res.status(503);
    res.send("Server timeout");
    return;
  }
  next();
}

function internalErrorMiddleware(err, req, res, next) {
  console.error(err.stack);
  res.status(500);
  res.send("Internal server error");
}

module.exports = app;
