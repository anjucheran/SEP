const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Operator = new Schema({
  user : {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
  name : String,
  contact: String,
  birthday: Date,
  gender : String,
  nic : String,
  address : String,
  centre : {type: mongoose.Schema.Types.ObjectId, ref: 'Centre'},
});

module.exports = mongoose.model('Operator', Operator);