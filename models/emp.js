var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var EmpSchema = new Schema({
    url: {type: String, required: true, max: 100},
    name: {type: String, required: true, max: 100},
    nickname: {type: String, required: true, max: 100},
});

module.exports = mongoose.model('Emp',EmpSchema);
