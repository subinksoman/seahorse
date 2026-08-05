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

var passport = require('passport');
// Was the unmaintained github dep `passport-cloudfoundry` -> maintained generic `passport-oauth2`.
var OAuth2Strategy = require('passport-oauth2');
var config = require('../config/config');

var strategy = new OAuth2Strategy({
  authorizationURL: config.oauth.authorizationUri,
  tokenURL: config.oauth.tokenUri,
  clientID: config.oauth.clientId,
  clientSecret: config.oauth.clientSecret,
  callbackURL: '/oauth/callback',
  passReqToCallback: false
}, function (accessToken, refreshToken, profile, done) {
  profile = profile || {};
  profile.accessToken = accessToken;
  done(null, profile);
});

// passport-cloudfoundry exposed setUserProfileURI(); passport-oauth2 fetches the profile via
// userProfile(accessToken, done) — hit the configured user-info endpoint with the bearer token
// (native fetch, Node 18+).
strategy.userProfile = function (accessToken, done) {
  fetch(config.oauth.userInfoUri, { headers: { 'Authorization': 'Bearer ' + accessToken } })
    .then(function (r) { return r.json(); })
    .then(function (json) { done(null, json); })
    .catch(function (err) { done(err); });
};

// passport-cloudfoundry exposed strategy.reset(); passport-oauth2 has none, and auth.js calls it on
// login/logout — provide a no-op so that path keeps working.
strategy.reset = function () {};

// Keep the 'cloudfoundry' strategy name so auth.js's passport.authenticate('cloudfoundry') is unchanged.
passport.use('cloudfoundry', strategy);

passport.serializeUser(function (user, done) {
  done(null, user);
});
passport.deserializeUser(function (user, done) {
  done(null, user);
});

module.exports = {
  passport: passport,
  strategy: strategy
};
