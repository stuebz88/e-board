var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var RolesSchema = new Schema({
    conflicts: [Number],
    conflictTimes: [String],
    date: {type: Date}
});

module.exports = mongoose.model('Roles',RolesSchema);
