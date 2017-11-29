var express = require('express');
var async = require('async');
var ical = require('ical.js');
var fetch = require('node-fetch');
var mongoose = require('mongoose');
var Emp = require('../models/emp');
var router = express.Router();

router.get('/',function(req,res,next) {
    Emp.find(function(err,result) {
        res.render('admin',{emps: result});
    });
});

function addTest() {
    var test = new Emp({url:'http://www.schedulesource.net/Enterprise/Public/EmployeeSchedule.aspx?&id=C6E25BA5-197A-4787-855B-F3A5AB65D391&format=ical',name:'Vaj, Ntxawm',nickname:'Zer'});
    test.save(function(err,result) {
        if(err)
        {
            return console.log(err);
        }
        console.log(test.name);
    });
}

router.post('/rename',function(req,res,next) {
    req.sanitize('name').escape();
    req.sanitize('name').trim();
    req.sanitize('url').trim();
    console.log('==Rename==');
    console.log(req.body);
    res.redirect('/admin');
});

router.post('/add',function(req,res,next) {
    async.waterfall([function(callback) {
        // Retrieves ical data from url provided
        fetch(req.body.url,{body : String})
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
    }, function(jcal,callback) {
        // Get name from jcal
        var entry = new Emp({url:req.body.url,name:jcal[1][4][3].substring(19),nickname:''});
        entry.save(function(err,result) {
            if(err)
            {
                return console.log(err);
            }
            callback(null,'success');
        });
    }], function(err,results) {
         res.redirect('/admin');
     });
});

module.exports = router;
