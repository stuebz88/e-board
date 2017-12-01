var express = require('express');
var fetch = require('node-fetch');
var ical = require('ical.js');
var async = require('async');
var mongoose = require('mongoose');
var Emp = require('../models/emp');
var gcal = require('../google/gcal')
var router = express.Router();

router.get('/',function(req,res,next) {
    Emp.find(function(err,result) {
        getSchedule(res,result);
    });
});

function getSchedule(res,emps) {
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
        // Draw HTML page
        res.render('index',{title : 'Help Desk E-Board', schedule : sched});
    });
}

module.exports = router;
