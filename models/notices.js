var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var NoticesSchema = new Schema({
    text: {type: String}
});

module.exports = mongoose.model('Notices',NoticesSchema);
