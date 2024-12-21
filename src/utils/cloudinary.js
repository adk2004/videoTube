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
      resource_type: "auto", // detects wether the file is image audi pdf etc etc..
    });
    //file has been uploaded successfully
    // console.log("File has been uloaded successfully", response.url);
    fs.unlinkSync(localFilePath); // remove the locally saved file after successful upload
    // console.log(response);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); // remove the locally saved file in case of failure
    return null;
  }
};

const deleteFromCloudinary = async (publicUrl) => {
  try {
    if (!publicUrl) {
      return null;
    }
    const parts = publicUrl.split("/");
    const fileWithExtension = parts[parts.length - 1]; // e.g., "image_id.jpg"
    const publicId = fileWithExtension.split(".")[0]; // Remove extension
    const result = await cloudinary.api.delete_resources([publicId]);
    return result;
  } catch (error) {
    console.error(error.message);
    throw error;
  }
};

const uploadVideo = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "video",
      eager: [
        { streaming_profile: "hd", format: "m3u8" },
        { streaming_profile: "sd", format: "m3u8" },
        { streaming_profile: "low", format: "m3u8" },
      ],
    });

    fs.unlinkSync(localFilePath);

    // Generate the master playlist URL
    const masterPlaylistUrl = generateStreamingUrl(response.public_id);
    console.log("Master Playlist URL:", masterPlaylistUrl);
    console.log("response.eager", response.eager);

    return {
      videoUrl: response.secure_url,
      masterPlaylistUrl,
      duration: response.duration,
    };
  } catch (error) {
    if (localFilePath) fs.unlinkSync(localFilePath);
    console.error("Error uploading video:", error.message);
    return null;
  }
};

const generateStreamingUrl = (publicId) => {
  try {
    if (!publicId) {
      return null;
    }
    return cloudinary.url(`${publicId}.m3u8`, {
      streaming_profile: "auto",
      resource_type: "video",
    });
  } catch (error) {
    console.error("Error generating streaming URL:", error.message);
    throw error;
  }
};

export {
  uploadOnCloudinary,
  deleteFromCloudinary,
  generateStreamingUrl,
  uploadVideo,
};
