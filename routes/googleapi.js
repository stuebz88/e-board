var express = require('express');
var gcal = require('../google/gcal');
var router = express.Router();

var oauth2Client;
var callback;

router.get('/',function(req,res,next) {
    res.render('googleapi',{url : 'Test'});
});

router.post('/submit',function(req,res,next) {
    gcal.addNewToken(req.body.code,res);
});

module.exports = router;
