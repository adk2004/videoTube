import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query,
    sortBy = "views",
    sortType = "desc",
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
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
