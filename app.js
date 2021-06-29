const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

require('dotenv').config();

var searchkey="";

const app=express();
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

const pswd = process.env.PSWD;

mongoose.connect('mongodb+srv://Arijit:'+pswd+'@cluster0.qosfo.mongodb.net/item', {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set("useCreateIndex", true);


const dataSchema = new mongoose.Schema({
  heading: String,
  topic: String,
  content: String,
  author: String
});


const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret:process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/conoscenza",
    userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo'
  },
  function(accessToken, refreshToken, profile, cb) {
    //console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


const Item = mongoose.model("Item",dataSchema);

const defaultItem = new Item ({
  heading: "conoscenza",
  topic: "Others",
  content: "A knowledge sharing platform to help people find and learn different topics shared by other users.Also letting users share their knowledge about different topics thus helping others.This project ensures enablement of  the democratization of knowledge.",
  author: "Arijit Dalui"
});

const itemarray = [defaultItem];


app.get("/",function(req,res){
Item.find({}, function(err,requireditems){
  if(requireditems.length === 0)
  {
    Item.insertMany(itemarray,function(err){
      if(err)
      {
        console.log(err);
      }
      else{
        console.log("Successfully saved item to database");
      }
    });
    res.redirect("/");
  }
  else
  {
    res.render("index",{});
  }
});
});

app.get("/auth/google",
  passport.authenticate("google",{ scope: ['profile']
    })
);

app.get('/auth/google/conoscenza',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/compose");
  });

app.get("/content",function(req,res){
  res.render("content",{searchkey: searchkey,searchitems: itemarray});
});

app.get("/about",function(req,res){
  res.render("about");
});

app.get("/login",function(req,res){
  res.render("login",{});
});

app.get("/register",function(req,res){
  res.render("Register",{});
});

app.get("/compose",function(req,res){
  if(req.isAuthenticated()){
    res.render("compose");
  }
  else
  {
    res.redirect("/login");
  }
});

app.get("/logout",function(req,res){
  req.logout();
  res.redirect("/");
});


app.post("/",function(req,res){
  searchkey=req.body.textfield;
  searchkey=searchkey.toLowerCase();
  Item.find({"heading":searchkey},function(err,requireditem){
    if(err)
    {
      console.log(err);
    }
    else
    {
      console.log(requireditem);
      if(requireditem.length===0)
      res.redirect("/");

      else
      res.render("content",{searchkey: searchkey,requireditem: requireditem});
    }
  });

});

app.post("/register",function(req,res){
  // const newUser = new User({
  //   email: req.body.username,
  //   password: req.body.password
  // });
  //
  // newUser.save(function(err,result){
  //   if(err){
  //     console.log(err);
  //   }
  //
  //   else
  //   {
  //     res.render("compose");
  //   }
  // });
  User.register({username: req.body.username}, req.body.password, function(err,user){
    if(err)
    {
      console.log(err);
      res.redirect("/register");
    }
    else
    {
      passport.authenticate("local")(req,res,function(){
        res.redirect("/compose");
      })
    }
  });
});


app.post("/login",function(req,res){
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user,function(err){
    if(err){
      console.log(err);
    }
    else
    {
      passport.authenticate("local")(req,res,function(){
        res.redirect("/compose");
      })
    }
  })


});


app.post("/compose",function(req,res){
  const compose_heading = req.body.title;
  const compose_topic = req.body.topic;
  const compose_content = req.body.content;
  const compose_author = req.body.author;

  Item.find({"heading": compose_heading},function(err,result){
    if(err)
    {
      console.log(err);
    }
    else
    {
      if(result.length===0)
      {
        try{
        Item.create({"heading": compose_heading.toLowerCase() , "topic": compose_topic , "content": compose_content , "author": compose_author});
        res.redirect("/");
      }
      catch(e){
        console.log(e);
      }
      }
      else
      {
        res.render("duplicate");
      }
    }
  });
});


let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port,function(){
  console.log("Server running at port successfully");
});
