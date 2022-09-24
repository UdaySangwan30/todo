
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const _=require("lodash");
const mongoose = require("mongoose");
const session=require("express-session");
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate=require("mongoose-findorcreate");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(session({
       secret:"thisisourlittlesecret",
       resave:false,
       saveUninitialized:false
     }));
     app.use(passport.initialize());
     app.use(passport.session());

 
mongoose.connect("mongodb://127.0.0.1:27017/userDB");
     const userSchema= new mongoose.Schema({
       email:String,
       password:String,
       googleId:String
     });


     userSchema.plugin(passportLocalMongoose);
     userSchema.plugin(findOrCreate);

     const User = new mongoose.model("User",userSchema);
     passport.use(User.createStrategy());

     passport.serializeUser(function(user, done) {
   done(null,user.id);
   });

   passport.deserializeUser(function(id, done) {
   User.findById(id,function(err,user){
     done(err,user);
   });
   });

     passport.use(new GoogleStrategy({
     clientID: process.env.CLIENT_ID,
     clientSecret: process.env.CLIENT_SECRET,
     callbackURL: "http://localhost:3000/auth/google/list",
     userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
   },
   function(accessToken, refreshToken, profile, cb) {
     User.findOrCreate({ googleId: profile.id }, function (err, user) {
       return cb(err, user);
     });
   }
 ));


 const ItemSchema={
   name:String
 }

 const Item = mongoose.model("Item", ItemSchema);

 const item1 = new Item({
   name:"Welcome to your todo list"
 })
 const item2 = new Item({
   name:"Hit the Add button to add new task"
 })
 const item3 = new Item({
   name:"<-- Hit this to delete the task"
 })
 const defaultItems=[item1,item2,item3];

 const listSchema={
   name:String,
   items:[ItemSchema]
 }
const List=mongoose.model("list",listSchema);

app.get("/",function(req,res){
  res.render("home");
});
app.get("/auth/google",
      passport.authenticate('google', { scope: ["profile"] })
    );

    app.get("/auth/google/list",
      passport.authenticate("google", { failureRedirect: "/login" }),
      function(req, res) {
        // Successful authentication, redirect home.
        res.redirect("/list");
      });
      app.get("/login",function(req,res){
        res.render("login");
      })

      app.get("/signup",function(req,res){
        res.render("signup");
      });


app.get("/list", function(req, res) {

if(req.isAuthenticated()){
  Item.find({},function(err,foundItems){

    if(foundItems.length===0){
      Item.insertMany(defaultItems,function(err){
        if(err)
        console.log(err)
        else {
          console.log("successfully added");
          res.render("list", {listTitle: "Today", newListItems: foundItems});
        }
      });
    }
    else {
      res.render("list", {listTitle: "Today", newListItems: foundItems});
    }

  });
}
else {
  res.redirect("/login");
}



});


app.get("/:customListName",function(req,res){
  const customListName=_.capitalize(req.params.customListName);

  List.findOne({name: customListName},function(err,foundList){
    if(!err){
      if(!foundList){
        const list = new List({
          name:customListName,
          items:defaultItems
        });
          list.save();
          res.redirect("/list/"+customListName);
      }
      else {
        res.render("list", {listTitle: foundList.name, newListItems: foundList.items});
      }
    }
  });



});

app.post("/list", function(req, res){

  const itemName = req.body.newItem;
  const listName = req.body.list;
     const item = new Item({
       name: itemName
     });

     if(listName === "Today"){
       item.save();
       res.redirect("/list");
     }
     else {
       List.findOne({name:listName},function(err,foundList){
      foundList.items.push(item);
      foundList.save();
      res.redirect("/"+listName);
       })
     }

});
app.post("/signup",function(req,res){

    User.register({username:req.body.username},req.body.password,function(err,user){
      if(err){
        console.log(err);
        res.redirect("/login");
      }
      else {
        passport.authenticate("local")(req,res,function(){
          res.redirect("/list");
        });
      }
    });
});


   app.post("/login",function(req,res){

    const user=new User({
      username:req.body.username,
      password:req.body.password
    });
    req.login(user,function(err){
      if(err)
      console.log(err);
      else {
        passport.authenticate("local")(req,res,function(){
          res.redirect("/list");

    });
}
});
});

app.post("/delete",function(req,res){
  const checkedboxId=req.body.checkbox;
  const listName=req.body.listName;
  if(listName==="Today"){
    Item.findByIdAndRemove(checkedboxId,function(err){
      if(!err){
      console.log("successfully deleted item.")
      res.redirect("/list");
    }
          });
    }

    else {
List.findOneAndUpdate({name:listName},{$pull:{items:{_id:checkedboxId}}},function(err,foundList){
  if(!err){
    res.redirect("/list/"+listName);
  }
});
    }


});

app.get("/work", function(req,res){
  res.render("list", {listTitle: "Work List", newListItems: workItems});
});

app.get("/about", function(req, res){
  res.render("about");
});

app.listen(process.env.PORT || 3000, function() {
  console.log("Server started on port 3000");
});
