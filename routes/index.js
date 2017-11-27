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
    'http://www.schedulesource.net/Enterprise/Public/EmployeeSchedule.aspx?&id=204B792C-1659-4D28-AF19-28C054391174&format=ical',
    'http://www.schedulesource.net/Enterprise/Public/EmployeeSchedule.aspx?&id=770EAAC0-2108-48B1-819A-DB2881DEF3D3&format=ical',
    'http://www.schedulesource.net/Enterprise/Public/EmployeeSchedule.aspx?&id=FA91B797-12E8-43FF-ACA2-E1A7DC14128B&format=ical'];
var names = ['Teagan','Erica','Zer','Derek','Jenna','Tyler'];

router.get('/',function(req,res,next) {
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
                        console.log(startDate+' '+sched[k][1]);
                        console.log(endDate+' '+sched[k][0]);
                        if(dateEquals(startDate,sched[k][1]))
                        {
                            startDate = sched[k][0];
                            sched = sched.splice(sched,k);
                            break;
                        }
                        else if(dateEquals(endDate,sched[k][0]))
                        {
                            endDate = sched[k][1];
                            sched = sched.splice(sched,k);
                            break;
                        }
                    }
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
        // Draw HTML page
        res.render('index',{title : 'Help Desk E-Board', schedule : sched});
    });
});

function dateEquals(a,b)
{
    if(a.hours==b.hours && a.minutes==b.minutes) {
        return true;
    }
    return false;
}

module.exports = router;
