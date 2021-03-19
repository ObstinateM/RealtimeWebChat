const express = require('express');
const path = require('path');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv').config();

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

app.get('/', (req, res) => {
    res.render('index');
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
                        let add = {email: email, username: username, password: password}
                        let query = db.query(sql, add, (err, _result) => {
                            if(err) throw err;
                        });
                        res.send("Pass");
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

app.post('/login', (req, res) => {
    res.redirect('/');
});

io.on('connection', (socket) =>{
    socket.on('chat message', (msg) => {
        io.emit('chat message', msg);
    });
});

server.listen(3000, () => {
    console.log('localhost:3000 ON !');
});

// To import from another file
function emailExistInDatabase(email, callback) {
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