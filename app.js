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
const session=require("express-session");
const flash=require("connect-flash")
const User=require("./models/user.js");
const passport=require("passport");
const LocalStrategy=require("passport-local"); 
const ExpressError=require("./middleware/expressError.js");

const atlasDbUrl = process.env.ATLASDB_URL;
const sessionSecret = process.env.SESSION_SECRET || "mysesionIdxabcd";

//App Configuration
app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views")); 
app.use(express.urlencoded({extended:true}));
app.use(methodOverride('_method'));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname,"public")));

//Session Configuration
const seesionOption = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
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

//Passport Configuration
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//Flash Messages Middleware
app.use((req,res,next)=>{
    res.locals.success=req.flash("success");
    res.locals.error=req.flash("error");
    res.locals.currentUser=req.user||null;
    next()
});

//Database Connection
async function connectDatabase(){
    if (!atlasDbUrl) throw new Error("ATLASDB_URL is not set in .env");
    await mongoose.connect(atlasDbUrl, {
      dbName: "mydatabase",
      serverSelectionTimeoutMS: 5000
    });
    console.log("✅ Connected to MongoDB Atlas!");
}

async function startServer() {
  try {
    await connectDatabase();
    app.locals.isDbConnected = true;
    
    //Load Routes AFTER Database Connection
    const listingRouter=require('./router/listing.js');
    const reviewRouter=require('./router/review.js'); 
    const userRouter=require("./router/user.js");

    // Root route redirect
    app.get("/", (req, res) => {
        res.redirect("/listing");
    });

    app.use("/listing", listingRouter);
    app.use("/listing/:id/reviews", reviewRouter);
    app.use("/", userRouter);

    //Error Handling Routes
    app.all("*", (req, res, next) => {
        next(new ExpressError(404, "Page not found"));
    });

    app.use((err, req, res, next) => {
        let { statusCode = 500, message = "Something went wrong" } = err;
        res.status(statusCode).render("listing/alert.ejs",{message});
    });

    //Start Server
    const port = Number(process.env.PORT) || 3000;
    const server = app.listen(port, () => {
        console.log(`🚀 Server is running on http://localhost:${port}`);
    });

    server.on("error", (err) => {
        if (err.code === "EADDRINUSE") {
            console.error(`❌ Port ${port} is already in use. Change PORT in .env.`);
            process.exit(1);
        }
        throw err;
    });

  } catch (err) {
    app.locals.isDbConnected = false;
    console.error("❌ MongoDB Atlas Connection Failed:");
    console.error(err.message);
    console.error("\nFix: Check your .env file for ATLASDB_URL");
    process.exit(1);
  }
}

startServer();


