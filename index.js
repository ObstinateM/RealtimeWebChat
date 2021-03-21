const express = require('express');
const path = require('path');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv').config();
const session = require('express-session');
const passport = require('passport');
require('./config/passport')(passport);
const { ensureAuthenticated } = require('./config/auth');

const flash = require('connect-flash');

/*   Database Part   */

const mysql = require('mysql');

const db = mysql.createConnection({
  host : process.env.DB_HOST,
  user : process.env.DB_USER,
  password : process.env.DB_PASSWORD,
  database : process.env.DB_DATABASE,
  port : '8889',
  socketPath : '/Applications/MAMP/tmp/mysql/mysql.sock'
});

db.connect((err) => {
  if(err) throw(err);
  console.log('MySQL connect ON');
});

/*   Web Part   */

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({extended: false}));
app.use(session({
    secret: 'Secret Stuff FR',
    resave: true,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use((req, res, next) => {
    res.locals.error = req.flash('error');
    next();
});


app.get('/', (req, res) => {
    let user = req.user;
    console.log('USER IS = ', user);
    res.render('index', {user: req.user});
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', async (req, res) => {
    const { username, email, password, password2 } = req.body;
    let errors = [];

    if(!username || !email || !password || !password2){
        errors.push({ msg: 'Fill all fields' });
    }

    if(password != password2){
        errors.push({ msg:'Password do not match' });
    }

    if(password.length < 8){
        errors.push({ msg:'Password should be at least 8 characters' });
    }

    if(errors.length > 0){
        res.render('register', {
            errors,
            username,
            email,
            password,
            password2
        });
    } else {
        emailExistInDatabase(email, (emailExist) => {
            if(!emailExist){
                usernameExistInDatabase(username, (usernameExist) => {
                    if(!usernameExist){
                        let sql = `INSERT INTO users SET ?`;
                        bcrypt.genSalt(10, (err, salt) => {
                            bcrypt.hash(password, salt, (err, hash) => {
                                if(err) throw err;
                                let add = {email: email, username: username, password: hash}
                                let query = db.query(sql, add, (err, _result) => {
                                    if(err) throw err;
                                });
                                res.send("Pass");
                            });
                        });
                    } else {
                        errors.push({ msg:'Username already exist.' });
                        res.render('register', {
                            errors,
                            username,
                            email,
                            password,
                            password2
                        });
                    }
                });
            } else {
                errors.push({ msg:'Email already exist.' });
                res.render('register', {
                    errors,
                    username,
                    email,
                    password,
                    password2
                });
            }
        });
    }
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login',
  passport.authenticate('local', { successRedirect: '/',
                                   failureRedirect: '/login',
                                   failureFlash: true })
);

app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/login');
});

app.get('/app', ensureAuthenticated, (req, res) => {
    res.render('chat', {user: req.user});
});

io.on('connection', (socket) =>{
    socket.on('chat message', (msg, userIdSender) => {
        io.emit('chat message', msg, userIdSender);
    });
});

server.listen(3000, () => {
    console.log('localhost:3000 ON !');
});

// To import from another file
function emailExistInDatabase(email, callback) { // return true if exist
    let sql = `SELECT COUNT(email) as mailNumber FROM users WHERE email = '${email}'`;
    let query = db.query(sql, (err, result) => {
        if(err) throw err;
        callback(result[0].mailNumber !== 0);
    });
}

/*
Check if a username is already stored in the database
*/
function usernameExistInDatabase(username, callback) {
    let sql = `SELECT COUNT(username) as usernameNumber FROM users WHERE username = '${username}'`;
    let query = db.query(sql, (err, result) => {
        if(err) throw err;
        callback(result[0].usernameNumber !== 0);
    });
}