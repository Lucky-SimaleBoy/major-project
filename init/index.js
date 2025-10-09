const mongoose=require('mongoose');
const listing=require('../models/listing.js');
const initData=require('./data.js');
const User = require('../models/user.js');

async function main(){
    await mongoose.connect("mongodb://localhost:27017/mydatabase");
  
}
main().then(()=>{
    console.log("connected to database");
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
        owner: "68a19051aaadc087d5beae68",
    }));
    await listing.insertMany(initData.data);
    console.log("data initialized");
}
initDb();