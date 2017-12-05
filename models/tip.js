var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var TipSchema = new Schema({
    text: {type: String},
});

module.exports = mongoose.model('Tip',TipSchema);
