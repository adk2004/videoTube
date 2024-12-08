import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    console.log(`\n MongoDB Connected... DB HOST : ${connectionInstance.connection.host}`);
  } catch (err) {
    console.error("Mongo DB Connection Error : ", err);
    process.exit(1);
    // read about process and exit
  }
};

export default connectDB;