var express = require('express');
//var gcal = require('../google/gcal');
var router = express.Router();

var oauth2Client;
var callback;

router.get('/',function(req,res,next) {
    res.render('googleapi',{url : 'Test'});
});

router.post('/submit',function(req,res,next) {
    console.log(req.body);
    //gcal.addNewToken(req.body.code,res);
    //res.render('googleapi',{url : req.body});
});

module.exports = router;
