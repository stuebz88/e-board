var express = require('express');
var async = require('async');
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

module.exports = router;
