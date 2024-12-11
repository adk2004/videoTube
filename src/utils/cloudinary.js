import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    //upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",// detects wether the file is image audi pdf etc etc..
    });
    //file has been uploaded successfully
    console.log("File has been uloaded successfully", response.url);
    fs.unlinkSync(localFilePath); // remove the locally saved file after successful upload
    console.log(response);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath) // remove the locally saved file in case of failure
    return null;
  }
};

export {uploadOnCloudinary};