const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Patient = new Schema({
  user : {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
  name : String,
  contact: String,
  birthday: Date,
  gender : String,
  nic : String,
  address : String,
});

module.exports = mongoose.model('Patient', Patient);