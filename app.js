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
const City = require('./models/city');
const app = express();

const users = {'Normal User': Patient, 'Doctor': Doctor, 'Channelling Centre Owner': Owner, 'Admin': Admin,
'Operator': Operator};

const ownerRoutes = require('./routes/owner');

app.use(ownerRoutes);

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

app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  next();
});

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

const getUsername = (user) => {
  users[user.usertype].findOne({user: user._id}, (err, foundUser) => {
    if(err) {
      return err;
    }
    return foundUser.name;
  });
}

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
    let today = new Date();
    date = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    res.redirect(`/doctor/schedule/${date}`);
  }
});

app.get('/doctor/schedule/:date', isLoggedIn, isDoctor, (req, res) => {
  Doctor.findOne({user: req.user._id}, (err, doctor) => {
    if(err) {
      console.log(err);
      return res.redirect('/');
    }
    Timeslot.find({doctor: doctor._id, pending: true, declined: 0}).populate('centre').exec((err, pendings) => {
      if(err) {
        console.log(err);
        return res.redirect('/');
      }
      return res.render('doctorHome', {doctor: doctor, pendings: pendings, username: getUsername(req.user),
      date: req.params.date});
    });
  });
});

app.post('/timeslot/:id/doctor/remove', (req, res) => {
  const id = req.params.id;
  Timeslot.findById(id, (err, timeslot) => {
    if(err) {
      console.log(err);
    }
    else {
      timeslot.declined = 2;
      timeslot.save();
      return res.redirect('/doctor');
    }
  });
});

app.post('/timeslot/:id/accept', (req, res) => {
  const id = req.params.id;
  Timeslot.findById(id, (err, timeslot) => {
    if(err) {
      console.log(err);
    }
    else {
      timeslot.pending = false;
      timeslot.save();
      return res.redirect('/doctor');
    }
  });
});

app.listen(3000, () => console.log('App listening on port 3000!'));