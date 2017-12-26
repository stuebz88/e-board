var express = require('express');
var fetch = require('node-fetch');
var ical = require('ical.js');
var async = require('async');
var mongoose = require('mongoose');
var Emp = require('../models/emp');
var Notices = require('../models/notices');
var Roles = require('../models/roles');
var Tip = require('../models/tip');
var gcal = require('../google/gcal');
var router = express.Router();

router.get('/',function(req,res,next) {
    async.parallel([
        getSchedule,
        gcal.getITOut,
        getNotices,
        getTips
    ], function(err,result) {
        generateRoles(result[0],function(roles) {
            res.render('index',{title : 'Help Desk E-Board', schedule : result[0], itout : result[1], notices : result[2], tips : result[3], roles: roles});
        });
    });
});

function getSchedule(callback) {
    async.waterfall([
        findAllEmps(),
        makeSchedule
    ], function(err,sched) {
        console.log(sched);
        callback(null,sched);
    });
}

function findAllEmps(callback) {
    Emp.find(function(err,emps) {
        callback(err,emps);
    });
}

function makeSchedule(emps,callback) {
    // Retrieve ical data for each employee
    async.mapSeries(emps,retrieveIcalData,filterShifts(callback));
}

function retrieveIcalData(emp,callback) {
    // Retrieves ICAL data from url provided
    fetch(emp.url,{body:String})
    .then(function(ical) {
        var chunks = [];
        // Converts ICAL data from binary to jcal format
        ical.body.on('data',function(chunk) {
            chunks.push(chunk);
        });
        ical.body.on('end',function(chunk) {
            var name = emp.nickname ? emp.nickname : emp.name;
            callback(null,[name,ICAL.parse(Buffer.concat(chunks).toString())]);
        });
    });
}

function filterShifts(callback) {
    return function(err,results) {
        var sched = [];
        var today = new Date();
        for(var i=0; i<results.length; i++) {
            var comp = new ICAL.Component(results[i][1]);
            var events = comp.getAllSubcomponents('vevent');
            // Get the index of sched with the first entry for this person
            var firstOf = sched.length;
            // For each shift retrieved, check if it is for that day
            for(var j=0; j<events.length; j++) {
                var event = new ICAL.Event(events[j]);
                var startDate = new Date(event.startDate);
                var endDate = new Date(event.endDate);
                // If shift is at the Help Desk, check its date
                // If event is on current date, set it to be displayed
                if(event.summary=='Help Desk' &&
                    startDate.getDate()==today.getDate() &&
                    startDate.getMonth()==today.getMonth()) {
                    // Combine adjacent shifts worked by the same person
                    for(var k=firstOf; k<sched.length; k++) {
                        if(startDate.getTime()===sched[k][1].getTime()) {
                            startDate = sched[k][0];
                            sched = sched.splice(sched,k);
                            break;
                        } else if(endDate.getTime()===sched[k][0].getTime()) {
                            endDate = sched[k][1];
                            sched = sched.splice(sched,k);
                            break;
                        }
                    }
                    // Add start time, end time, and name of person
                    sched.push([startDate,endDate,results[i][0]]);
                }
            }
        }
        sched = sched.sort(function(a,b) {
            if(a[0]<b[0]) return -1;
            else if(a[0]>b[0]) return 1;
            else if(a[1]<b[1]) return -1;
            else return 1;
        });
        callback(null,sched);
    }
}

function getNotices(callback) {
    Notices.find(function(err,notices) {
        callback(null,notices);
    });
}

function getTips(callback) {
    Tip.find(function(err,tips) {
        callback(null,tips);
    });
}

function generateRoles(shifts,callback) {
    var roles = [];
    Roles.find(function(err,role) {
        var today = new Date();
        if(role.length>0 &&
            (role[0].date.getDate()!=today.getDate() ||
            role[0].date.getMonth()!=today.getMonth()))
        {
            Roles.remove(function(err) {
                callback(roles);
            });
        }

        if(role.length==0) {
            roles.push(-2);
            roles.push(-1);
            callback(roles);
        } else {
            var curRole = role[0].conflicts[0]
            roles.push(curRole);
            var curConflict = 0;
            for(var i=1; i<shifts.length; i++) {
                // If start times are equal
                if(shifts[i][0].getTime()==shifts[i-1][0].getTime()) {
                    // If this conflict is not yet resolved
                    if(role[0].conflicts.length<curConflict+1) {
                        roles.pop();
                        roles.push(-2);
                        roles.push(-1);
                        break;
                    } else {
                        // Push resolution of conflict
                        roles.pop();
                        roles.push(role[0].conflicts[curConflict]);
                        curRole = (role[0].conflicts[curConflict]+1)%2;
                        roles.push(curRole);
                    }
                    curConflict++;
                } else if(shifts[i][0].getTime()<shifts[i-1][1].getTime()) {
                    curRole = (curRole+1)%2;
                    roles.push(curRole);
                } else {
                    roles.push(curRole);
                }
            }
            callback(roles);
        }
    });
}

router.post('/pickRole',function(req,res,next) {
    Roles.find(function(err,role) {
        var today = new Date();
        if(role.length==0 ||
            (role[0].date.getDate()!=today.getDate() ||
            role[0].date.getMonth()!=today.getMonth()))
        {
            Roles.remove(function(err) {
                var data = JSON.parse(req.body.voicemail ? req.body.voicemail : req.body.email);
                if((typeof req.body.voicemail !== 'undefined' && data[0] === -2) ||
                    (typeof req.body.email !== 'undefined' && data[0] === -1)) {
                    new Roles({conflicts:[0],conflictTimes:[data[1]],date:new Date()}).save(function() {
                        res.redirect('/');
                    });
                } else {
                    new Roles({conflicts:[1],conflictTimes:[data[1]],date:new Date()}).save(function() {
                        res.redirect('/');
                    });
                }
            });
        } else {
            var data = JSON.parse(req.body.voicemail ? req.body.voicemail : req.body.email);
            // Make sure the conflict is not already resolved
            if(role[0].conflictTimes.indexOf(data[1])<0) {
                role[0].conflictTimes.push(data[1]);
                if((typeof req.body.voicemail !== 'undefined' && data[0]==-2) ||
                    (typeof req.body.email !== 'undefined' && data[0]==-1)) {
                    role[0].conflicts.push(0);
                } else {
                    role[0].conflicts.push(1);
                }
                role[0].save(function() {
                    res.redirect('/');
                });
            }
        }
    });
});

module.exports = router;
