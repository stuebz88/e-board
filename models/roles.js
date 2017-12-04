var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var RolesSchema = new Schema({
    role: {type: Number},
    date: {type: Date}
});

module.exports = mongoose.model('Roles',RolesSchema);
