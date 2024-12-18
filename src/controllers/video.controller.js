import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query,
    sortBy = "createdAt",
    sortType = "asc",
  } = req.query;

  // Validate input
  if (!query?.trim()) {
    throw new ApiError(400, "Search query is missing");
  }
  if (!["views", "duration", "createdAt"].includes(sortBy)) {
    throw new ApiError(400, "SortBy is missing or invalid");
  }
  if (!["asc", "desc"].includes(sortType)) {
    throw new ApiError(400, "SortType is missing or invalid");
  }

  // Build aggregation pipeline
  const pipeline = [
    {
      $match: {
        $or: [
          { title: { $regex: query, $options: "i" } }, // Correct $regex syntax
          { description: { $regex: query, $options: "i" } }, // Correct $regex syntax
        ],
        isPublished: true,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              fullName: 1,
              avatar: 1,
              username: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$owner",
        },
      },
    },
    {
      $sort: {
        [sortBy]: sortType === "asc" ? 1 : -1,
      },
    },
  ];

  // Pagination options
  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  try {
    // Perform aggregation with pagination
    const result = await Video.aggregatePaginate(
      Video.aggregate(pipeline),
      options
    );

    // Check for results
    if (!result?.docs?.length) {
      throw new ApiError(404, "No videos found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Videos fetched successfully"));
  } catch (error) {
    // Handle and log errors
    console.error("Error fetching videos:", error);
    throw new ApiError(500, "Internal server error");
  }
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title?.trim() || !description?.trim()) {
    throw new ApiError(400, "Missing title or description");
  }

  if (
    !req.files ||
    !Array.isArray(req.files.videoFile) ||
    !req.files.videoFile[0]
  ) {
    throw new ApiError(400, "Video file is required");
  }

  if (
    !req.files ||
    !Array.isArray(req.files.thumbnail) ||
    !req.files.thumbnail[0]
  ) {
    throw new ApiError(400, "Thumbnail is required");
  }

  if (!req.user?._id) {
    throw new ApiError(
      401,
      "Unauthorized. User must be logged in to publish a video"
    );
  }
  console.log(req.files, "\n");
  const videoFileLocalPath = req.files.videoFile[0].path;
  const thumbnailLocalPath = req.files.thumbnail[0].path;

  const videoFile = await uploadOnCloudinary(videoFileLocalPath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!videoFile || !videoFile.url) {
    throw new ApiError(500, "Error while uploading video file to Cloudinary");
  }

  if (!thumbnail || !thumbnail.url) {
    throw new ApiError(500, "Error while uploading thumbnail to Cloudinary");
  }
  console.log(videoFile, "\n");
  const video = await Video.create({
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    title: title.trim(),
    description: description.trim(),
    duration: videoFile.duration,
    isPublished: true,
    views: 0,
    owner: req.user._id,
  });

  if (!video) {
    throw new ApiError(500, "Error while creating the video");
  }

  // the potential issue with this code is that file types are not
  // enforced for videoFile it should be ensured its a valid video
  // extension and same for thumbnail it should be a valid image type

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video published successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id
  // we need to populate the owner details ,likes count , isLiked
  // we need to increase the views of the video by 1 and add to watch history
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid or missing VideoId");
  }
  if (!req.user?._id) {
    throw new ApiError(404, "Unauthorized request");
  }
  const pipeline = [
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
        isPublished: true,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              username: 1,
              avatar: 1,
              fullName: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$owner",
        },
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $addFields: {
        likesCount: {
          $size: "$likes",
        },
        isLiked: {
          $in: [new mongoose.Types.ObjectId(req.user._id), "$likes.likedBy"],
        },
      },
    },
    {
      $project: {
        videoFile: 1,
        thumbnail: 1,
        title: 1,
        description: 1,
        duration: 1,
        views: 1,
        createdAt: 1,
        owner: 1,
        isPublished: 1,
        likesCount: 1,
        isLiked: 1,
      },
    },
  ];

  const video = await Video.aggregate(pipeline);

  if (!video?.length) {
    throw new ApiError(404, "Video not found");
  }
  // update views and user watch history
  await Promise.all([
    Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } }),
    User.findByIdAndUpdate(req.user?._id, {
      $addToSet: { watchHistory: videoId },
    }),
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, video[0], "Video fetched Successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Video Id is not valid");
  }
  if (!isValidObjectId(req.user?._id)) {
    throw new ApiError(401, "Unauthorized request");
  }
  const { title, description } = req.body;
  if (!title?.trim() || !description?.trim()) {
    throw new ApiError(400, "Invalid title or description");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video does not exist");
  }
  if (!video.owner.equals(req.user.id)) {
    throw new ApiError(403, "User is not authorized to toggle publish status");
  }
  try {
    video.title = title.trim();
    video.description = description.trim();
    if (req.file) {
      const thumbnailLocalPath = req.file.path;
      const newThumbnail = await uploadOnCloudinary(thumbnailLocalPath);
      await deleteFromCloudinary(video.thumbnail);
      video.thumbnail = newThumbnail.url;
    }
    const updatedVideo = await video.save();
    return res
      .status(200)
      .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
  } catch (error) {
    throw new ApiError(500, error.meassge || "Error while updating the video");
  }
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid or missing VideoId");
  }
  if (!isValidObjectId(req.user?._id)) {
    throw new ApiError(401, "Unauthorized request");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video does not exist");
  }
  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "User is not authorized to delete the video");
  }

  try {
    await Promise.all([
      Video.findByIdAndDelete(videoId),
      deleteFromCloudinary(video.videoFile),
      deleteFromCloudinary(video.thumbnail),
      Like.deleteMany({ video: videoId }),
      Comment.deleteMany({ video: videoId }),
    ]);
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Video deleted successfully"));
  } catch (error) {
    throw new ApiError(
      500,
      error.message || "Something went wrong while deleting the video"
    );
  }
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Video Id is not valid");
  }
  if (!isValidObjectId(req.user?._id)) {
    throw new ApiError(401, "Unauthorized request");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video does not exist");
  }
  if (!video.owner.equals(req.user.id)) {
    throw new ApiError(403, "User is not authorized to toggle publish status");
  }
  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      isPublished: !video.isPublished,
    },
    { new: true }
  );
  if (!updatedVideo) {
    throw new ApiError(500, "Error while toggling publish status");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isPublished: updatedVideo.isPublished },
        "Publish status updated successfully"
      )
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
