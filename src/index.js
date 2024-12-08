// require('dotenv').config({path : './env'})

import dotenv from "dotenv";
import connectDB from "./db/index.js";
import express from "express";
const app = express();
dotenv.config({
  path: "./env",
});

connectDB();









/*
import express from "express";

const app = express();

(async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    app.on("error", (err) => {
      console.log("Error : can not talk to DB", err);
      throw err;
    });
    app.listen(process.env.PORT, () => {
      console.log(`Port is listening on port ${process.env.PORT}`);
    });
  } catch (error) {
    console.error("ERROR : ", error);
    throw err;
  }
})();
*/
