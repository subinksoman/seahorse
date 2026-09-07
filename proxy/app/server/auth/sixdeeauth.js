/**
 * Copyright 2026 6D Technologies
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

/**
 * Sign-in for an iframe whose parent portal already knows the user. The portal points the frame at
 * <proxy>/embed/session?token=…; this asks the portal's verifier whether that token is good, opens a
 * session from the identity it returns, and redirects to the app with the token stripped off.
 *
 *   browser  ->  /embed/session?token=KEY
 *   proxy    ->  <AUTHORIZATION_HOST>/verifier?key=KEY
 *   verifier ->  200 {"userId": "…", "userName": "…", "roleName": "…", "sessionId": "…"}
 *   proxy    ->  302 / with a session cookie
 *
 * A 200 carrying every required field means signed in; any other status, body or missing field means
 * not signed in. Same { init, login } contract as ./auth.js, and req.user comes out in the shape the
 * rest of the proxy expects — { user_id, user_name } — so reverse-proxy.js keeps injecting
 * x-seahorse-userid / x-seahorse-username unchanged. Everything the verifier returned stays on
 * req.user.claims.
 *
 * Configuration:
 *   AUTHORIZATION_HOST         required — the verifier is <host>/verifier
 *   AUTH_EMBED_VERIFY_METHOD   POST (default) | GET
 *   AUTH_EMBED_VERIFY_URL      only if the verifier is not at <AUTHORIZATION_HOST>/verifier
 *   SESSION_SECRET             session signing secret
 *
 * The rest is fixed: the token field is `key`, a 200 must carry userId, userName, roleName and
 * sessionId, the session lasts 8h, and the session cookie turns Secure/SameSite=None/Partitioned
 * whenever HTTPS_ENABLED is on. An https verifier is validated against SSL_CRT_FILE.
 */

const express = require('express');
const fs = require('fs');
const session = require('express-session');
const config = require('../config/config');
const serviceMapping = require('../config/service-mapping');

const AUTH_HOST = serviceMapping.authorization.host || '';
const TIMEOUT = Number(config.get('timeout')) || 30000;

const EMBED_PATH = '/embed/session';
const VERIFY_PARAM = 'key';
const REQUIRED_FIELDS = ['userId', 'userName', 'roleName', 'sessionId'];
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

// TLS terminated here means the app is served into a cross-site frame, where the session cookie
// only survives as SameSite=None; Secure, plus Partitioned for browsers blocking third-party cookies.
const SECURE_COOKIE = String(config.get('HTTPS_ENABLED') || '').toLowerCase() === 'true';
// an https verifier behind the proxy's own certificate is trusted through that same cert
const VERIFY_CA = config.get('SSL_CRT_FILE') || null;

const settings = {
  verifyUrl: config.get('AUTH_EMBED_VERIFY_URL') || (AUTH_HOST ? AUTH_HOST + '/verifier' : null),
  verifyMethod: (config.get('AUTH_EMBED_VERIFY_METHOD') || 'POST').toUpperCase()
};

module.exports = {
  init: init,
  login: login,
  settings: settings
};

function init(app) {
  console.log('sixdeeauth: embed sign-in at ' + EMBED_PATH + ', verifier ' + settings.verifyMethod + ' ' + settings.verifyUrl);

  app.use(session({
    name: 'JSESSIONID',
    secret: config.get('SESSION_SECRET') || 'seahorse-proxy-stable-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: SECURE_COOKIE ? 'none' : 'lax',
      secure: SECURE_COOKIE,
      // SameSite=None in a cross-site frame needs CHIPS to survive third-party cookie blocking
      partitioned: SECURE_COOKIE
    }
  }));

  app.get(EMBED_PATH, handoff);
  // POST keeps the token out of the URL entirely; parse just this route's body
  app.post(EMBED_PATH, express.urlencoded({ extended: false }), handoff);

  app.get('/logout', function (req, res) {
    res.clearCookie('JSESSIONID');
    res.clearCookie('seahorse_user');
    if (!req.session) {
      return res.redirect('/');
    }
    req.session.destroy(function () {
      res.redirect('/');
    });
  });
}

function login(req, res, next) {
  const user = req.session && req.session.sixdeeUser;

  if (!user) {
    return notSignedIn(res, 'no session');
  }
  if (Date.now() > user.expiresAt) {
    return notSignedIn(res, 'session expired');
  }
  req.user = user;
  next();
}

async function handoff(req, res) {
  const token = (req.query && (req.query.token || req.query.key)) ||
                (req.body && (req.body.token || req.body.key));
  let claims;

  try {
    claims = await verify(token);
  } catch (err) {
    console.warn('sixdeeauth: rejected token — ' + err.message);
    return res.status(401).type('html').send(page('Not signed in',
      'This session could not be opened. Reload the page from your portal.'));
  }

  // userId/userName are the Seahorse identity; roleName and sessionId ride along for downstream use
  const user = {
    user_id: String(claims.userId),
    user_name: String(claims.userName),
    role: String(claims.roleName),
    session_id: String(claims.sessionId),
    expiresAt: Date.now() + SESSION_TTL_MS,
    claims: claims
  };

  console.log('sixdeeauth: signed in ' + user.user_name + ' (' + user.user_id + ')');
  req.session.sixdeeUser = user;
  req.session.save(function () {
    // land on the app without the token — it must not survive in history, logs or referrers
    res.redirect(safePath(claims.return_to || (req.query && req.query.redirect)));
  });
}

async function verify(token) {
  if (!settings.verifyUrl) {
    throw new Error('no verifier configured (set AUTHORIZATION_HOST)');
  }
  if (!token || typeof token !== 'string') {
    throw new Error('no token supplied');
  }

  const url = new URL(settings.verifyUrl);
  const post = settings.verifyMethod === 'POST';
  if (!post) {
    url.searchParams.set(VERIFY_PARAM, token);
  }

  const answer = await httpJson(url, post ? new URLSearchParams({ [VERIFY_PARAM]: token }).toString() : null);

  if (answer.status !== 200) {
    throw new Error('verifier answered ' + answer.status);
  }

  const claims = answer.body.data || answer.body;
  const missing = REQUIRED_FIELDS.filter(function (field) {
    return claims[field] === undefined || claims[field] === null || claims[field] === '';
  });
  if (missing.length) {
    throw new Error('verifier response is missing ' + missing.join(', '));
  }
  return claims;
}

function httpJson(url, body) {
  const transport = url.protocol === 'https:' ? require('https') : require('http');
  const headers = { 'Accept': 'application/json' };

  if (body) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    headers['Content-Length'] = Buffer.byteLength(body);
  }

  const options = { method: settings.verifyMethod, headers: headers, timeout: TIMEOUT };
  if (url.protocol === 'https:' && VERIFY_CA) {
    options.ca = fs.readFileSync(VERIFY_CA);
  }

  return new Promise(function (resolve, reject) {
    const call = transport.request(url, options, function (response) {
      let text = '';
      response.setEncoding('utf8');
      response.on('data', function (chunk) { text += chunk; });
      response.on('end', function () {
        try {
          resolve({ status: response.statusCode, body: text ? JSON.parse(text) : {} });
        } catch (e) {
          reject(new Error('verifier returned non-JSON: ' + text.slice(0, 120)));
        }
      });
    });
    call.on('timeout', function () { call.destroy(new Error('verifier timed out')); });
    call.on('error', reject);
    if (body) {
      call.write(body);
    }
    call.end();
  });
}

function notSignedIn(res, why) {
  console.warn('sixdeeauth: unauthenticated request (' + why + ')');
  res.status(401).type('html').send(page('Not signed in',
    'This application is opened from your portal. Reload the page there to continue.',
    '<script>try{parent.postMessage({type:"ae-session-expired"},"*")}catch(e){}</script>'));
}

function safePath(target) {
  // only same-origin paths, so a crafted return_to cannot bounce the user off-site
  return (typeof target === 'string' && target.charAt(0) === '/' && target.charAt(1) !== '/') ? target : '/';
}

function page(title, message, extra) {
  return '<!doctype html><meta charset="utf-8"><title>' + escapeHtml(title) + '</title>' +
    '<body style="font:14px system-ui;margin:3rem auto;max-width:34rem;color:#222">' +
    '<h1 style="font-size:18px">' + escapeHtml(title) + '</h1><p>' + escapeHtml(message) + '</p>' +
    (extra || '');
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}
