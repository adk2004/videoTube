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
  //TODO: get all videos based on query, sort, pagination
  // check for presence of query
  // check for sortBy it can be by views or duration only for now
  // use pagination
  if (!query?.trim()) {
    throw new ApiError(400, "Search Query is Missing");
  }
  if (!["views", "duration", "createdAt"].includes(sortBy)) {
    throw new ApiError(400, "SortBy is missing or invalid");
  }
  if (!["asc", "desc"].includes(sortType)) {
    throw new ApiError(400, "SortType is missing or invalid");
  }
  const pipeline = [
    {
      $match: {
        $or: [
          { title: { $regex: query, options: "i" } },
          { description: { $regex: query, options: "i" } },
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
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
  };
  try {
    const result = await Video.aggregatePaginate(
      Video.aggregate(pipeline),
      options
    );
    if (!result?.length) {
      throw new ApiError(404, "No video found");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, result, "Videos fetched Successfully"));
  } catch (error) {
    throw new ApiError(500, "Error while fetching videos");
  }
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video
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
