const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Timeslot = new Schema({
  doctor: {type: mongoose.Schema.Types.ObjectId, ref: 'Doctor'},
  centre: {type: mongoose.Schema.Types.ObjectId, ref: 'Centre'},
  date: Date,
  start: String,
  end: String,
  pending: {type: Boolean, default: true},
  declined: {type: Number, default: 0},
});

module.exports = mongoose.model('Timeslot', Timeslot);