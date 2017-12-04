var express = require('express');
var fetch = require('node-fetch');
var ical = require('ical.js');
var async = require('async');
var mongoose = require('mongoose');
var Emp = require('../models/emp');
var Notices = require('../models/notices');
var Roles = require('../models/roles');
var gcal = require('../google/gcal');
var router = express.Router();

router.get('/',function(req,res,next) {
    async.parallel([function(callback) {
        getSchedule(res,function(sched) {
            callback(null,sched);
        });
    }, function(callback) {
        callback(null,gcal.getITOut());
    }, function(callback) {
        Notices.find(function(err,notices) {
            callback(null,notices);
        });
    }], function(err,result) {
        generateRoles(result[0],function(roles) {
            res.render('index',{title : 'Help Desk E-Board', schedule : result[0], itout : result[1], notices : result[2], roles: roles});
        });
    });
});

function getSchedule(res,callback) {
    Emp.find(function(err,emps) {
        if(err)
        {
            return console.log(err);
        }
        async.mapSeries(emps, function(emp,callback) {
            // Retrieves ical data from url provided
            fetch(emp.url,{body : String})
            .then(function(ical) {
                const chunks = [];
                ical.body.on("data",function(chunk) {
                    chunks.push(chunk);
                });
                ical.body.on("end",function(chunk) {
                    // Puts ical data into jcal format
                    var name = emp.nickname ? emp.nickname : emp.name;
                    callback(null,[name,ICAL.parse(Buffer.concat(chunks).toString())]);
                });
            });
        }, function(err,results) {
            var sched = [];
            var today = new Date();
            for(var i=0; i<results.length; i++)
            {
                var comp = new ICAL.Component(results[i][1]);
                var events = comp.getAllSubcomponents('vevent');
                // Get the index of sched with the first entry for this person
                var firstOf = sched.length;
                // For each shift retrieved, check if it is for that day
                for(var j=0; j<events.length; j++)
                {
                    var event = new ICAL.Event(events[j]);
                    var startDate = new Date(event.startDate);
                    var endDate = new Date(event.endDate);
                    // If shift is at the Help Desk, check its date
                    // If event is on current date, set it to be displayed
                    if(event.summary=='Help Desk' &&
                        startDate.getDate()==today.getDate() &&
                        startDate.getMonth()==today.getMonth())
                    {
                        // Combine adjacent shifts
                        for(var k=firstOf; k<sched.length; k++)
                        {
                            if(startDate.getTime()===sched[k][1].getTime())
                            {
                                startDate = sched[k][0];
                                sched = sched.splice(sched,k);
                                break;
                            }
                            else if(endDate.getTime()===sched[k][0].getTime())
                            {
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
            // Sort events by time first, then name if times are equal
            sched = sched.sort(function(a,b) {
                if(a[0]<b[0]) return -1;
                else if(a[0]>b[0]) return 1;
                else if(a[1]<b[1]) return -1;
                else return 1;
            });
            callback(sched);
        });
    });
}

function getNotices() {
    Notices.find(function(err,notices) {
        return notices;
    });
}

function generateRoles(shifts,callback) {
    var roles = [];
    Roles.find(function(err,role) {
        var today = new Date();
        if(role.length==0 ||
            role[0].date.getDate()!=today.getDate() ||
            role[0].date.getMonth()!=today.getMonth())
        {
            Roles.remove(function(err) {
                callback(roles);
            });
        }
        else
        {
            var curRole = role[0].role;
            roles.push(curRole);
            for(var i=1; i<shifts.length; i++)
            {
                if(shifts[i][0].getTime()<shifts[i-1][1].getTime())
                {
                    curRole = (curRole+1)%2;
                    roles.push(curRole);
                }
                else
                {
                    roles.push(curRole);
                }
            }
            console.log('Roles: '+roles);
            callback(roles);
        }
    });
}

router.post('/pickRole',function(req,res,next) {
    console.log(req.body);
    Roles.find(function(err,role) {
        var today = new Date();
        if(role.length==0 ||
            role[0].date.getDate()!=today.getDate() ||
            role[0].date.getMonth()!=today.getMonth())
        {
            Roles.remove(function(err) {
                if(req.body.voicemail === '0') {
                    new Roles({role:0,date:new Date()}).save(function() {
                        res.redirect('/');
                    });
                } else {
                    new Roles({role:1,date:newDate()}).save(function() {
                        res.redirect('/');
                    });
                }
            });
        }
        else
        {
            res.redirect('/');
        }
    });
});

module.exports = router;
