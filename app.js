if(process.env.NODE_ENV !="production"){
    require('dotenv').config();
   
}
const express=require('express');
const app=express();
const mongoose=require('mongoose');
const ejs=require('ejs');
const ejsMate=require('ejs-mate');
const path=require('path');
var methodOverride = require('method-override');
const { error } = require('console');
const session=require("express-session");
const MongoStore = require('connect-mongo');
const { reviewSchema } = require("./schema.js");
const flash=require("connect-flash")
const listingRouter=require('./router/listing.js');
const reviewRouter=require('./router/review.js'); 
const userRouter=require("./router/user.js");
const User=require("./models/user.js");
const passport=require("passport");
const LocalStrategy=require("passport-local"); 
const ExpressError=require("./middleware/expressError.js");


app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views")); 
app.use(express.urlencoded({extended:true}));//use to take data from form 
app.use(methodOverride('_method'));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname,"public")));
// const dbUrl='mongodb://127.0.0.1:27017/mydatabase';
const dbUrl=process.env.ATLASDB_URL;//for connection to database
//for static filee css or js we use code in other folder
//router
// app.get("/",(req,res)=>{
//     res.send("Hi i am root route");
// })
const store=MongoStore.create({
    mongoUrl:dbUrl,
    touchAfter:24*60*60,
    crypto:{
        secret:"mysesionIdxabcd",
    }
});
store.on("error",function(e){
    console.log("session error",e);
});
const seesionOption = {//session
    store: store,
    secret: "mysesionIdxabcd",
    resave: false,
    saveUninitialized: true,
    cookie:{
        expire:Date.now()+7*24*60*60*1000,
        maxAge:7*24*60*60*1000,
        httpOnly:true,
    }
  };
  app.use(session(seesionOption));
  app.use(flash());
  app.use(passport.initialize());
  app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
 passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

  app.use((req,res,next)=>{
    res.locals.success=req.flash("success");
    res.locals.error=req.flash("error");
    res.locals.currentUser=req.user||null;
    next()
  })
  // app.get("/registerUser", async (req, res, next) => {
  //   try {
  //     const fakeUser = new User({
  //       email: "lucky@gmail.com",
  //       username: "Lucky gupta"
  //     });
  //     const newUser = await User.register(fakeUser, "helloworld");
  //     res.send(newUser);
  //   } catch (err) {
  //     next(err);
  //   }
  // });
  
app.use("/listing",listingRouter);
app.use("/listing/:id/reviews",reviewRouter);
app.use("/",userRouter);

//database connection
async function main(){
    // await mongoose.connect(dbUrl);
    await mongoose.connect(dbUrl, {
    
        serverSelectionTimeoutMS: 30000 // waits up to 30 seconds
      });
}
main().then(()=>{
    console.log("connected to database");
}).catch((err)=>{
    console.log(err);
})


//for all if anyrote not run than err
app.all("*", (req, res, next) => {
    next(new ExpressError(404, "Page not found"));
});
    // middleware for errror handling 
    app.use((err, req, res, next) => {
        let { statusCode = 500, message = "Something went wrong" } = err;
      res.status(statusCode).render("listing/alert.ejs",{message});
    });
    app.listen(8080,()=>{
        console.log("Server is running on port 8080");
    })


