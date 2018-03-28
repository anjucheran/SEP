const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Centre = new Schema({
  name : String,
  slmareg : String,
  address : String,
  contact : String,
  doctors : [{type: mongoose.Schema.Types.ObjectId, ref: 'Doctor'}],
  operators : [{type: mongoose.Schema.Types.ObjectId, ref: 'Operator'}],
});

module.exports = mongoose.model('Centre', Centre);