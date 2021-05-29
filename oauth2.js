// Copyright 2012 Google LLC
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');
const opn = require('open');
const destroyer = require('server-destroy');

const {google} = require('googleapis');
const youtube = google.youtube('v3');

/**
 * To use OAuth2 authentication, we need access to a a CLIENT_ID, CLIENT_SECRET, AND REDIRECT_URI.  To get these credentials for your application, visit https://console.cloud.google.com/apis/credentials.
 */
// const keyPath = path.join(__dirname, 'oauth2.keys.json');
const keyPath = path.join(__dirname, 'oauth2_sub.keys.json');
const file = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

let keys = {redirect_uris: ['']};
if (fs.existsSync(keyPath)) {
  keys = file.web;
}

/**
 * Create a new OAuth2 client with the configured keys.
 */
const oauth2Client = new google.auth.OAuth2(
  keys.client_id,
  keys.client_secret,
  keys.redirect_uris[0]
);

/**
 * This is one of the many ways you can configure googleapis to use authentication credentials.  In this method, we're setting a global reference for all APIs.  Any other API you use here, like google.drive('v3'), will now use this auth client. You can also override the auth client at the service and method call levels.
 */
google.options({auth: oauth2Client});

/**
 * Add process to save the token to the key file when getting the token
 */
oauth2Client.on('tokens', (tokens) => {
  if (tokens.refresh_token) {
    file.web.token = tokens;
    fs.writeFile(keyPath, JSON.stringify(file), (err) => { if (err) throw err; });
  }
});

/**
 * Open an http server to accept the oauth callback. In this simple example, the only request to our webserver is to /callback?code=<code>
 */
async function authenticate(scopes) {
  return new Promise((resolve, reject) => {
    /**
     * Add authentication process using access token if already exists
     */
    if (keys.token) {
      oauth2Client.setCredentials(keys.token);
      return resolve(oauth2Client);
    }
    // grab the url that will be used for authorization
    const authorizeUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes.join(' '),
    });
    const server = http
      .createServer(async (req, res) => {
        try {
          if (req.url.indexOf('/oauth2callback') > -1) {
            const qs = new url.URL(req.url, 'http://localhost:3000')
              .searchParams;
            res.end('Authentication successful! Please return to the console.');
            server.destroy();
            const {tokens} = await oauth2Client.getToken(qs.get('code'));
            oauth2Client.setCredentials(tokens);
            resolve(oauth2Client);
          }
        } catch (e) {
          reject(e);
        }
      })
      .listen(3000, () => {
        // open the browser to the authorize url to start the workflow
        opn(authorizeUrl, {wait: false}).then(cp => cp.unref());
      });
    destroyer(server);
  });
}

module.exports = authenticate;
