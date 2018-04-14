const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const City = new Schema({
  name : String,
  centres : [{type: mongoose.Schema.Types.ObjectId, ref: 'Centre'}],
});

module.exports = mongoose.model('City', City, 'cities');