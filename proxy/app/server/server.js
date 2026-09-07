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


/**
 * Module dependencies.
 */

var app = require('./app');
var debug = require('debug')('console:server');
var fs = require('fs');
var http = require('http');
var https = require('https');
var path = require('path');
var reverseProxy = require('./reverse-proxy');

/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(process.env.PORT || '8080');
app.set('port', port);

var host = process.env.HOST || "0.0.0.0";

/**
 * Create the server: HTTPS when TLS material is available, plain HTTP otherwise.
 */

var certDir = process.env.SSL_CERT_DIR || '/opt/docker/certs';
var httpsEnabled = String(process.env.HTTPS_ENABLED || '').toLowerCase();
var tlsOptions = httpsEnabled === 'false' ? null : loadTlsOptions(certDir);

if (!tlsOptions && httpsEnabled === 'true') {
  console.error('HTTPS_ENABLED=true but no certificate/key found (looked in ' + certDir +
    ', or set SSL_CRT_FILE / SSL_KEY_FILE)');
  process.exit(1);
}

var server = tlsOptions ? https.createServer(tlsOptions, app) : http.createServer(app);
app.set('tls', Boolean(tlsOptions));

/**
 * Resolve the certificate/key pair, either from explicit env paths or by scanning `dir`.
 * Returns null when nothing usable is present.
 */

function loadTlsOptions(dir) {
  var crtFile = resolveCert(process.env.SSL_CRT_FILE, dir, [/\.(crt|cer)$/i, /^fullchain.*\.pem$/i, /\.pem$/i], true);
  var keyFile = resolveCert(process.env.SSL_KEY_FILE, dir, [/\.key$/i, /^(privkey|key).*\.pem$/i], false);

  if (!crtFile || !keyFile) {
    if (crtFile || keyFile) {
      console.error('Ignoring TLS material: found only ' + (crtFile ? 'a certificate' : 'a key') +
        ', both a certificate and a key are required');
    }
    return null;
  }

  var caFile = resolveCert(process.env.SSL_CA_FILE, dir, [/^(ca|chain|ca-bundle).*\.(crt|pem)$/i], false);
  var options;
  try {
    options = {
      cert: fs.readFileSync(crtFile),
      key: fs.readFileSync(keyFile)
    };
    if (caFile && caFile !== crtFile) {
      options.ca = fs.readFileSync(caFile);
    }
  } catch (e) {
    // most often a key mounted 0600 root:root that the container's `node` user cannot read
    console.error('Cannot read TLS material: ' + e.message);
    return null;
  }

  if (process.env.SSL_KEY_PASSPHRASE) {
    options.passphrase = process.env.SSL_KEY_PASSPHRASE;
  }

  console.log('TLS enabled — cert: ' + crtFile + ', key: ' + keyFile + (caFile ? ', ca: ' + caFile : ''));
  return options;
}

function resolveCert(explicitPath, dir, patterns, isCert) {
  if (explicitPath) {
    var resolved = path.isAbsolute(explicitPath) ? explicitPath : path.join(dir, explicitPath);
    if (!fs.existsSync(resolved)) {
      console.error('Configured TLS file does not exist: ' + resolved);
      return null;
    }
    return resolved;
  }

  var entries;
  try {
    entries = fs.readdirSync(dir).sort();
  } catch (e) {
    return null;
  }

  for (var i = 0; i < patterns.length; i++) {
    for (var j = 0; j < entries.length; j++) {
      var name = entries[j];
      if (!patterns[i].test(name)) {
        continue;
      }
      // a key must never be picked up as the certificate
      if (isCert && /(^|[-_.])(key|privkey)([-_.]|$)/i.test(name)) {
        continue;
      }
      var candidate = path.join(dir, name);
      try {
        if (fs.statSync(candidate).isFile()) {
          return candidate;
        }
      } catch (e) {
        // unreadable entry — keep looking
      }
    }
  }
  return null;
}

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port, host);
server.on('error', onError);
server.on('listening', onListening);
server.on('upgrade', reverseProxy.forwardWebSocket);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string' ?
    'Pipe ' + port :
    'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string' ?
    'pipe ' + addr :
    'port ' + addr.port;
  console.log('Proxy listening on ' + bind + ' (' + (tlsOptions ? 'https' : 'http') + ')');
  debug('Listening on ' + bind);
}
