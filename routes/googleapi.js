var express = require('express');
var router = express.Router();

router.get('/',function(req,res,next) {
    res.render('googleapi',{url : 'Test'});
});

router.post('/submit',function(req,res,next) {
    res.render('googleapi',{url : req.body});
});

module.exports = router;
