import mongoose, { isValidObjectId } from "mongoose";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid or missing videoId");
  }
  if (!req.user || !isValidObjectId(req.user._id)) {
    throw new ApiError(401, "Unathorized request");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video does not exist");
  }
  // Pagination options
  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };
  const pipeline = [
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
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
              fullName: 1,
              avatar: 1,
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
      $project: {
        owner: 1,
        content: 1,
      },
    },
  ];
  try {
    const comments = await Comment.aggregatePaginate(
      Comment.aggregate(pipeline),
      options
    );
    return res
      .status(200)
      .json(new ApiResponse(200, comments, "Comments fetched successfully"));
  } catch (error) {
    throw new ApiError(
      500,
      error.message || "Something went wrong while fetching comments"
    );
  }
});

const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content } = req.body;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid or missing videoId");
  }
  if (!req.user || !isValidObjectId(req.user._id)) {
    throw new ApiError(401, "Unathorized request");
  }
  if (!content?.trim()) {
    throw new ApiError(400, "Content cannot be empty");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video does not exist");
  }
  const comment = await Comment.create({
    content,
    video: videoId,
    owner: req.user._id,
  });
  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment added successfully"));
});

const updateComment = asyncHandler(async (req, res) => {});

const deleteComment = asyncHandler(async (req, res) => {});

export { getVideoComments, addComment, updateComment, deleteComment };
