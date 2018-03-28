const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Owner = new Schema({
  user : {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
  name : String,
  contact: String,
  birthday: Date,
  gender : String,
  nic : String,
  address : String,
  centres : [{type: mongoose.Schema.Types.ObjectId, ref: 'Centre'}],
});

module.exports = mongoose.model('Owner', Owner);