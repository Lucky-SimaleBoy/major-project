if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}
const mongoose=require('mongoose');
const listing=require('../models/listing.js');
const initData=require('./data.js');
const User = require('../models/user.js');
const localDbUrl = process.env.LOCAL_DB_URL || "mongodb://127.0.0.1:27017/mydatabase";
const atlasDbUrl = process.env.ATLASDB_URL;

async function main(){
    try {
        await mongoose.connect(localDbUrl, { dbName: "mydatabase", serverSelectionTimeoutMS: 5000 });
        console.log("connected to database (local)");
        return;
    } catch (localErr) {
        if (!atlasDbUrl) throw localErr;
    }

    await mongoose.connect(atlasDbUrl, { dbName: "mydatabase", serverSelectionTimeoutMS: 5000 });
    console.log("connected to database (atlas)");
  
}
main().then(async()=>{
    await initDb();
}).catch((err)=>{
    console.log(err);
})

let initDb=async()=>{
    // Ensure there is a valid user to reference as owner
    let seedUser = await User.findOne({ username: 'seeduser' });
    if (!seedUser) {
        const user = new User({ email: 'seed@example.com', username: 'seeduser' });
        // Default password for seed user
        seedUser = await User.register(user, 'seedpassword');
    }

    await listing.deleteMany({});
    initData.data = initData.data.map((obj) => ({
        ...obj,
        owner: seedUser._id,
    }));
    await listing.insertMany(initData.data);
    console.log("data initialized");
    await mongoose.connection.close();
}