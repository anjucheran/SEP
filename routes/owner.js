const express = require('express');
const router = express.Router();
const passport = require('passport');
const LocalStrategy = require('passport-local');

const User = require('../models/user');
const Patient = require('../models/patient');
const Doctor = require('../models/doctor');
const Owner = require('../models/owner');
const Operator = require('../models/operator');
const Admin = require('../models/admin');
const Centre = require('../models/centre');
const Timeslot = require('../models/timeslot');
const City = require('../models/city');

const users = {'Normal User': Patient, 'Doctor': Doctor, 'Channelling Centre Owner': Owner, 'Admin': Admin,
'Operator': Operator};

router.use(require('express-session')({
  secret: 'Channelling made easier',
  resave: true,
  saveUninitialized: true
}));
router.use(passport.initialize());
router.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

const isLoggedIn = (req, res, next) => {
  if(req.isAuthenticated()){
    return next();
  }
  res.redirect('/login');
};
  
const isOwner = (req, res, next) => {
  let usertype = req.user.usertype;
  if(usertype === 'Channelling Centre Owner') {
    return next();
  }
  res.redirect('/');
};

const isOwnedBy = (req, res, next) => {
  let centre = req.params.id;
  Owner.findOne({user: req.user._id}, (err, owner) => {
    if(err) {
      console.log(err);
      return res.redirect('/');
    }
    let index = owner.centres.indexOf(centre);
    if(index === -1) {
      return res.redirect('/owner/centres');
    }
    return next();
  });
};

const getUsername = (user) => {
  users[user.usertype].findOne({user: user._id}, (err, foundUser) => {
    if(err) {
      return err;
    }
    return foundUser.name;
  });
}

router.get('/centre/new', isLoggedIn, isOwner, (req, res) => {
  const name = getUsername(req.user);
  console.log(name);
  City.find({}, (err, cities) => {
    if(err) {
      console.log(err);
    }
    else {
      res.render('newCentre', {username: getUsername(req.user), cities: cities});
    }
  });
});

router.post('/centre', isLoggedIn, isOwner, (req, res) => {
  const name = req.body.name;
  const slmareg = req.body.slmareg;
  const address = req.body.address;
  const contact = req.body.contact;
  let centre = new Centre();
  centre.name = name;
  centre.slmareg = slmareg;
  centre.address = address;
  centre.contact = contact;
  centre.save();
  Owner.findOne({user: req.user._id}, (err, owner) => {
    if(err) {
      console.log(err);
      return res.redirect('/');
    }
    owner.centres.push(centre._id);
    owner.save();
    return res.redirect('/owner/centres');
  });
});

router.get('/owner/centres', isLoggedIn, isOwner, (req, res) => {
  Owner.findOne({user: req.user._id}).populate('centres').exec((err, owner) => {
    if(err) {
      console.log(err);
      return res.redirect('/');
    }
    const centres = owner.centres;
    return res.render('ownCentres', {name: owner.name, centres: centres, username: getUsername(req.user)});
  });
});

router.get('/centre/:id/schedule/:date', isLoggedIn, isOwner, isOwnedBy, (req, res) => {
  Timeslot.find({centre: req.params.id, date: req.params.date, pending: false, declined: 0}).populate('centre').populate('doctor').exec((err, timeslots) => {
    if(err) {
      console.log(err);
      return res.redirect('/owner/centres');
    }
    Centre.findById(req.params.id, (err, centre) => {
      if(err) {
        console.log(err);
      }
      Timeslot.find({centre: req.params.id, pending: true, declined: 0}).
      populate('centre').populate('doctor').exec((err, pendings) => {
        if(err) {
          console.log(err);
          return res.redirect('/owner/centres');
        }
        return res.render('schedule', {id: req.params.id, centre: centre, timeslots: timeslots, 
          date: req.params.date, pendings: pendings, username: getUsername(req.user)});
      });
    });
  });
});

router.get('/centre/:id/doctors', isLoggedIn, isOwner, isOwnedBy, (req, res) => {
  Centre.findOne({_id: req.params.id}).populate('doctors').exec((err, centre) => {
    if(err) {
      console.log(err);
      return res.redirect('/owner/centres');
    }
    return res.render('centreDoctors', {centre: centre, doctors: centre.doctors, id: req.params.id, username: getUsername(req.user)});
  });
});

router.post('/centre/:id/doctors', isLoggedIn, isOwner, isOwnedBy, (req, res) => {
  const slmareg = req.body.slmareg;
  Centre.findOne({_id: req.params.id}, (err, centre) => {
    if(err) {
      console.log(err);
      return res.redirect('/owner/centres');
    }
    Doctor.findOne({slmareg: slmareg}, (err, doctor) => {
      if(err) {
        console.log(err);
        return res.redirect('/centre/' + req.params.id + '/doctors');
      }
      centre.doctors.push(doctor._id);
      centre.save();
      return res.redirect('/centre/' + req.params.id + '/doctors');
    });
  });
});

router.delete('/centre/:id/doctor/:docID', isLoggedIn, isOwner, isOwnedBy, (req,res) => {
  Centre.findOne({_id: req.params.id}, (err, centre) => {
    if(err){
      console.log(err);
      return res.redirect('/owner/centres');
    }
    centre.doctors.pull(req.params.docID);
    centre.save();
    return res.redirect('/centre/' + req.params.id + '/doctors');
  });
});

router.get('/centre/:id/doctor/:docID/addtime', isLoggedIn, isOwner, isOwnedBy, (req, res) => {
  Centre.findOne({_id: req.params.id}, (err, centre) => {
    if(err) {
      console.log(err);
      return res.redirect('/owner/centres');
    }
    Doctor.findOne({_id: req.params.docID}, (err, doctor) => {
      if(err) {
        console.log(err);
        return res.redirect('/owner/centres');
      }
      const index = centre.doctors.indexOf(doctor._id);
      if(index !== -1) {
        return res.render('addTime', {centre: centre, doctor: doctor, username: getUsername(req.user)});
      }
      return res.redirect('/centre/' + req.params.id + '/doctors');
    });
  });
});

router.post('/centre/:id/doctor/:docID/addtime', isLoggedIn, isOwner, isOwnedBy, (req, res) => {
  Centre.findOne({_id: req.params.id}, (err, centre) => {
    if(err){
      console.log(err);
      return res.redirect('/owner/centres');
    }
    const index = centre.doctors.indexOf(req.params.docID);
    if(index !== -1) {
      let timeslot = new Timeslot();
      timeslot.doctor = req.params.docID;
      timeslot.centre = req.params.id;
      timeslot.date = req.body.date;
      timeslot.start = req.body.start;
      timeslot.end = req.body.end;
      timeslot.save();
      return res.redirect(`/centre/${req.params.id}/schedule/${req.body.date}`);
    }
    return res.render('/centre/' + req.params.id + '/doctors');
  });
});

router.post('/centre/:id/schedule', isLoggedIn, isOwner, isOwnedBy, (req, res) => {
  res.redirect(`/centre/${req.params.id}/schedule/${req.body.date}`);
});

router.post('/timeslot/:id/:date/owner/remove', (req, res) => {
  const id = req.params.id;
  const date = req.params.date;
  Timeslot.findById(id, (err, timeslot) => {
    if(err) {
      console.log(err);
    }
    else {
      timeslot.declined = 1;
      timeslot.save();
      return res.redirect(`/centre/${timeslot.centre}/schedule/${date}`);
    }
  });
});

module.exports = router;