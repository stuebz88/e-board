var express = require('express');
var fetch = require('node-fetch');
var ical = require('ical.js');
var async = require('async');
var router = express.Router();

/*
 * Students' information. Will be replaced with a database at some point.
 */
var urls = ['http://www.schedulesource.net/Enterprise/Public/EmployeeSchedule.aspx?&id=B3AE6962-6C82-4A6E-9170-6BD0426F88EE&format=ical',
    'http://www.schedulesource.net/Enterprise/Public/EmployeeSchedule.aspx?&id=D3A7AA58-6926-4A9D-86D9-E968880B0D08&format=ical',
    'http://www.schedulesource.net/Enterprise/Public/EmployeeSchedule.aspx?&id=C6E25BA5-197A-4787-855B-F3A5AB65D391&format=ical',
    'http://www.schedulesource.net/Enterprise/Public/EmployeeSchedule.aspx?&id=204B792C-1659-4D28-AF19-28C054391174&format=ical'];
var names = ['Teagan','Erica','Zer','Derek'];

router.get('/',function(req,res,next) {
    const getURLs = [];
    const jcals = [];

    async.mapSeries(urls, function(url,callback) {
        // Retrieves ical data from url provided
        fetch(url,{body : String})
        .then(function(ical) {
            const chunks = [];
            ical.body.on("data",function(chunk) {
                chunks.push(chunk);
            });
            ical.body.on("end",function(chunk) {
                // Puts ical data into jcal format
                callback(null,ICAL.parse(Buffer.concat(chunks).toString()));
            });
        });
    }, function(err,results) {
        var sched = [];
        var today = new Date();
        for(var i=0; i<results.length; i++)
        {
            var comp = new ICAL.Component(results[i]);
            var events = comp.getAllSubcomponents('vevent');
            // For each shift retrieved, check if it is for that day
            for(var j=0; j<events.length; j++)
            {
                var event = new ICAL.Event(events[j]);
                var startDate = new Date(event.startDate);
                var endDate = new Date(event.endDate);
                // If event is on current date, add to display array
                if(startDate.getDate()==today.getDate()-2 &&
                    startDate.getMonth()==today.getMonth())
                {
                    sched.push([startDate,endDate,names[i]]);
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
        sched.push([sched[0][0],sched[0][1],'Steve']);
        sched.push([sched[0][0],sched[0][1],'Veronica']);
        sched.push([sched[0][0],sched[0][1],'Jimmy']);
        sched.push([sched[0][0],sched[0][1],'Stacy']);
        sched.push([sched[0][0],sched[0][1],'George']);
        sched.push([sched[0][0],sched[0][1],'Carmen']);
        sched.push([sched[0][0],sched[0][1],'Bobby']);
        sched.push([sched[0][0],sched[0][1],'Sue']);
        // Draw HTML page
        res.render('home',{title : 'Test', schedule : sched});
    });
});

module.exports = router;
