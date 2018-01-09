var express = require('express');
var router = express.Router();

router.get('/',function(req,res,next) {
    res.render('googleapi',{url : 'Test'});
});

module.exports = router;
