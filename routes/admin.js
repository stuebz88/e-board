var express = require('express');
var async = require('async');
var ical = require('ical.js');
var fetch = require('node-fetch');
var mongoose = require('mongoose');
var Emp = require('../models/emp');
var Notices = require('../models/notices');
var router = express.Router();

router.get('/',function(req,res,next) {
    async.parallel([function(callback) {
        Emp.find(function(err,result) {
            callback(err,result)
        });
    }, function(callback) {
        Notices.find(function(err,result) {
            callback(err,result);
        });
    }], function(err,result) {
        res.render('admin',{emps: result[0], notices: result[1]});
    });
});

router.post('/notices',function(req,res,next) {
    async.series([function(callback) {
        Notices.remove(function(err,removed) {
            callback(err,removed);
        });
    }, function(callback) {
        new Notices({text: req.body.notices}).save(function(err,result) {
            callback(err,result);
        });
    }], function(err,results) {
        res.redirect('/admin');
    });
});

router.post('/rename',function(req,res,next) {
    req.sanitize('name').escape();
    req.sanitize('name').trim();
    req.sanitize('url').trim();
    if(req.body.submit) {
        // Update the record
        Emp.findOneAndUpdate({url:req.body.url},{nickname:req.body.name},function(err,result) {
            res.redirect('/admin');
        });
    } else if(req.body.delete) {
        Emp.remove({url:req.body.url},function(err) {
            res.redirect('/admin');
        });
    }
});

router.post('/',function(req,res,next) {
    async.waterfall([function(callback) {
        // Retrieves ical data from url provided
        fetch(req.body.url,{body : String}).then(function(ical) {
            const chunks = [];
            ical.body.on("data",function(chunk) {
                chunks.push(chunk);
            });
            ical.body.on("end",function(chunk) {
                // Puts ical data into jcal format
                callback(null,ICAL.parse(Buffer.concat(chunks).toString()));
            });
        }).catch(function(err) {
            // If URL is not valid, this is called
            Emp.find(function(err,result) {
                res.render('admin',{emps: result,err:'The URL did not link to valid ICAL data.'});
            });
        });
    }, function(jcal,callback) {
        // Get name from jcal, which is stored in jcal[1][4][3]
        var entry = new Emp({url:req.body.url,name:jcal[1][4][3].substring(19),nickname:''});
        entry.save(function(err,result) {
            if(err)
            {
                return console.log(err);
            }
            callback(null,null);
        });
    }], function(err,results) {
        res.redirect('/admin');
     });
});

module.exports = router;
