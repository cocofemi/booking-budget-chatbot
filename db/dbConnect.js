const mongoose = require("mongoose");
require("dotenv").config;

async function dbConnect() {
  mongoose
    .connect(process.env.MONGO_URI, {
      //   these are options to ensure that the connection is done properly
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => {
      console.log("✅ Successfully connected to MongoDB Atlas!");
    })
    .catch((error) => {
      console.log("❌ Unable to connect to MongoDB Atlas!");
      console.error(error);
      process.exit(1);
    });
}

module.exports = dbConnect;
