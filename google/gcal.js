var express = require('express');
var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');

var SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'calendar-nodejs-quickstart.json';
var oauth2Client;
var callback;
var auth;

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, res) {
    var clientSecret = credentials.installed.client_secret;
    var clientId = credentials.installed.client_id;
    var redirectUrl = credentials.installed.redirect_uris[0];
    auth = new googleAuth();
    oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);
    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, function(err, token) {
        if (err) {
            getNewToken(res);
        } else {
            oauth2Client.credentials = JSON.parse(token);
            retrieveFromServer();
        }
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(res) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  res.render('googleapi',{url : authUrl});
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
    try {
        fs.mkdirSync(TOKEN_DIR);
    } catch (err) {
        if (err.code != 'EEXIST') {
            throw err;
        }
    }
    fs.writeFile(TOKEN_PATH, JSON.stringify(token), function() {
        console.log('Token stored to ' + TOKEN_PATH);
        retrieveFromServer();
    });
}

/**
 * Lists the next 10 events on the user's primary calendar.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function retrieveFromServer() {
    var calendar = google.calendar('v3');
    var itout = [];
    var endOfDay = new Date();
    endOfDay.setHours(23);
    endOfDay.setMinutes(59);
    calendar.events.list({
        auth: oauth2Client,
        calendarId: 'uwosh.edu_37373834323336302d3231@resource.calendar.google.com',
        timeMin: (new Date()).toISOString(),
        timeMax: endOfDay.toISOString(),
        singleEvents: true,
    }, function(err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        var events = response.items;
        if (events.length == 0) {
            console.log('No upcoming events found.');
        } else {
            for (var i = 0; i < events.length; i++) {
                var event = events[i];
                console.log('Event Start===============');
                console.log(event);
                var start = event.start.dateTime || event.start.date;
                var email = event.creator.email;
                var displayName = event.creator.displayName;
                if(event.attendees!=null) {
                    for(var j=0; j<event.attendees.length; j++) {
                        if(event.attendees[j].displayName!='itstaffout') {
                            email = event.attendees[j].email;
                            displayName = event.attendees[j].displayName;
                        }
                    }
                }
                itout.push([email,displayName,event.start.dateTime,event.end.dateTime]);
            }
            callback(null,itout.sort(function(a,b) {
                if(a[0]<b[0]) return -1;
                else if(a[0]>b[0]) return 1;
                else if(a[2]<b[2]) return -1;
                else return 1;
            }));
        }
    });
}

module.exports = {
    getITOut: function(res) {
        return function(call) {
            fs.readFile('./ignore/client_secret.json', function processClientSecrets(err, content) {
              if (err) {
                console.log('Error loading client secret file: ' + err);
                res.render('error',{message : err});
                return;
              }
              //
              callback = call;
              // Authorize a client with the loaded credentials, then call the
              // Google Calendar API.
              authorize(JSON.parse(content),res);
            });
        }
    },
    addNewToken: function(code,res) {
        oauth2Client.getToken(code, function(err, token) {
            if (err) {
                console.log('Error while trying to retrieve access token', err);
                return;
            }
            oauth2Client.credentials = token;
            storeToken(token);
            //retrieveFromServer();
        });
    }
}
