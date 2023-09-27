var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const saltRounds = 10;

module.exports = function(db){

router.get('/', function(req, res, next) {
  res.render('login', {failedInfo : req.flash('failedInfo'), successInfo : req.flash('successInfo')});
});

router.post('/', async function(req, res, next){
  try{
  const {email, password} = req.body

  const {rows : users} = await db.query('SELECT * FROM users WHERE email = $1', [email])

  if(users.length == 0){
    req.flash('failedInfo', `Email doesn't exist`)
    return req.redirect('/')
  }

  if(!bcrypt.compareSync(password, users[0].password)){
    req.flash('failedInfo', `Password is wrong`)
    return req.redirect('/')
  }

  req.session.user = {usersid : users[0].id, email : users[0].email, avatar : users[0].avatar}
  req.flash('successInfo', `anda berhasil login`)

  res.redirect('/users')
  }catch(e){
    console.log(e)
    res.redirect('/')
  }
})

router.get('/register', function(req, res, next) {
  res.render('register', {failedInfo : req.flash('failedInfo'), successInfo : req.flash('successInfo')});
});

router.post('/register', async function(req, res, next) {
  const {email, password, repassword} = req.body

  if(password !== repassword){
    req.flash('failedInfo',`password doesn't match`)
    return res.redirect('/register')
  } 

  const {rows: emails} = await db.query ('SELECT * FROM users WHERE email = $1', [email])

  console.log(emails)

  if(emails.length > 0){
    req.flash('failedInfo', `Email already exist`)
    return res.redirect('/register')
  } 

  const hash = bcrypt.hashSync(password, saltRounds);

  console.log(hash)

  await db.query('INSERT INTO users(email, password) VALUES ($1, $2)',[email,hash])

  req.flash('successInfo',`Anda berhasil register, Silahkan Login!`)

  res.redirect('/')
});

router.get('/logout', function(req, res){
  req.session.destroy(function(err){
    res.redirect('/')
  })
})

 return router;
}
