const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const methodOverride = require('method-override');

mongoose.connect('mongodb://localhost/test');
const User = require('./models/user');
const Patient = require('./models/patient');
const Doctor = require('./models/doctor');
const Owner = require('./models/owner');
const Operator = require('./models/operator');
const Admin = require('./models/admin');
const Centre = require('./models/centre');
const Timeslot = require('./models/timeslot');
const app = express();

const users = {'Normal User': Patient, 'Doctor': Doctor, 'Channelling Centre Owner': Owner, 'Admin': Admin,
'Operator': Operator};

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(methodOverride('_method'));
app.use(bodyParser.urlencoded({
  extended: false,
}));
app.use(require('express-session')({
  secret: 'Channelling made easier',
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

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

const isDoctor = (req, res, next) => {
  let usertype = req.user.usertype;
  if(usertype === 'Doctor') {
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

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const usertype = req.body.usertype;
  User.register({username: username, usertype: usertype}, password, (err, user) => {
    if(err) {
      console.log(err);
      res.redirect('/register');
    }
    else {
      console.log(user);
      let specUser = new users[usertype]();
      specUser.name = req.body.name;
      specUser.user = user._id;
      if(usertype === 'Doctor') {
        specUser.slmareg = req.body.slmareg;
      }
      specUser.save();
      passport.authenticate('local')(req, res, () =>{
        res.redirect('/secret');
      });
    }
  });
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', passport.authenticate('local', { 
  successRedirect: '/secret',
  failureRedirect: '/login', 
}));

app.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

app.get('/secret', isLoggedIn, (req, res) => {
  const usertype = req.user.usertype;
  if(usertype === 'Channelling Centre Owner') {
    res.redirect('/owner/centres');
  }
  else if(usertype === 'Doctor') {
    res.redirect('/doctor');
  }
});

app.get('/centre/new', isLoggedIn, isOwner, (req, res) => {
  res.render('newCentre');
});

app.post('/centre', isLoggedIn, isOwner, (req, res) => {
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

app.get('/owner/centres', isLoggedIn, isOwner, (req, res) => {
  Owner.findOne({user: req.user._id}).populate('centres').exec((err, owner) => {
    if(err) {
      console.log(err);
      return res.redirect('/');
    }
    const centres = owner.centres;
    return res.render('ownCentres', {centres: centres});
  });
});

// app.get('/centre/:id', isLoggedIn, isOwner, isOwnedBy, (req, res) => {
//   Centre.findOne({_id: req.params.id}).populate('doctors').populate('operators').exec((err, centre) => {
//     if(err) {
//       console.log(err);
//       return res.redirect('/owner/centres');
//     }
//     const today = new Date();
//     Timeslot.find({centre: req.params.id, date: today}).populate('doctor').exec((err, timeslots) => {
//       if(err) {
//         console.log(err);
//       }
//       return res.render('specCentre', {centre: centre, today: today, id: req.params.id, timeslots: timeslots});
//     });
//   });
// });

app.get('/centre/:id/schedule/:date', isLoggedIn, isOwner, isOwnedBy, (req, res) => {
  Timeslot.find({centre: req.params.id, date: req.params.date, pending: false}).populate('centre').populate('doctor').exec((err, timeslots) => {
    if(err) {
      console.log(err);
      return res.redirect('/owner/centres');
    }
    Centre.findById(req.params.id, (err, centre) => {
      if(err) {
        console.log(err);
      }
      Timeslot.find({centre: req.params.id, pending: true}).
      populate('centre').populate('doctor').exec((err, pendings) => {
        if(err) {
          console.log(err);
          return res.redirect('/owner/centres');
        }
        return res.render('schedule', {id: req.params.id, centre: centre, timeslots: timeslots, 
          date: req.params.date, pendings: pendings});
      });
    });
  });
});

app.get('/centre/:id/doctors', isLoggedIn, isOwner, isOwnedBy, (req, res) => {
  Centre.findOne({_id: req.params.id}).populate('doctors').exec((err, centre) => {
    if(err) {
      console.log(err);
      return res.redirect('/owner/centres');
    }
    return res.render('centreDoctors', {centre: centre, doctors: centre.doctors, id: req.params.id});
  });
});

app.post('/centre/:id/doctors', isLoggedIn, isOwner, isOwnedBy, (req, res) => {
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

app.delete('/centre/:id/doctor/:docID', isLoggedIn, isOwner, isOwnedBy, (req,res) => {
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

app.get('/centre/:id/doctor/:docID/addtime', isLoggedIn, isOwner, isOwnedBy, (req, res) => {
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
        return res.render('addTime', {centre: centre, doctor: doctor});
      }
      return res.render('/centre/' + req.params.id + '/doctors');
    });
  });
});

app.post('/centre/:id/doctor/:docID/addtime', isLoggedIn, isOwner, isOwnedBy, (req, res) => {
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

app.post('/centre/:id/schedule', isLoggedIn, isOwner, isOwnedBy, (req, res) => {
  res.redirect(`/centre/${req.params.id}/schedule/${req.body.date}`);
});

app.get('/doctor', isLoggedIn, isDoctor, (req, res) => {
  Doctor.findOne({user: req.user._id}, (err, doctor) => {
    if(err) {
      console.log(err);
      return res.redirect('/');
    }
    Timeslot.find({doctor: doctor._id, pending: true}).populate('centre').exec((err, pendings) => {
      if(err) {
        console.log(err);
        return res.redirect('/');
      }
      return res.render('doctorHome', {doctor: doctor, pendings: pendings});
    });
  });
});

app.listen(3000, () => console.log('App listening on port 3000!'));