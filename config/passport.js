const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt')

const mysql = require('mysql');

const db = mysql.createConnection({
  host : process.env.DB_HOST,
  user : process.env.DB_USER,
  password : process.env.DB_PASSWORD,
  database : process.env.DB_DATABASE,
  port : '8889',
  socketPath : '/Applications/MAMP/tmp/mysql/mysql.sock'
});

module.exports = function(passport) {
    passport.use(
        new LocalStrategy({usernameField: 'email'}, (email, password, done) => {
            emailExistInDatabase(email, (emailExist) => {
                if(emailExist){
                    // Y'a une email
                    let sql = `SELECT * FROM users WHERE email = '${email}'`;
                    let query = db.query(sql, (err, result) => {
                        console.log("RESULT PASSWORD : ", result[0].password)
                        if(err) throw err;
                        bcrypt.compare(password, result[0].password, (err, isMatch) => {
                            if(err) throw err;
                            if(isMatch){
                                return done(null, result[0]);
                            } else {
                                return done(null, false, { message: 'Password miss match' });
                            }
                        });
                    });
                } else {
                    // Aucun email dans la bdd
                    return done(null, false, { message: 'That email is not registered' });
                }
            });
        })
    );

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser((id, done) => {
        let sql = `SELECT * FROM users WHERE id = '${id}'`;
        let query = db.query(sql, (err, result) => {
            done(err, result[0]);
        });
    });
}

function emailExistInDatabase(email, callback) {
    let sql = `SELECT COUNT(email) as mailNumber FROM users WHERE email = '${email}'`;
    let query = db.query(sql, (err, result) => {
        if(err) throw err;
        callback(result[0].mailNumber !== 0);
    });
}