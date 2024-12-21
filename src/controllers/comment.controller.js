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
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "comment",
        as: "likes",
      },
    },
    {
      $addFields: {
        likesCount: { $size: "$likes" },
        isLiked: { $in: [req.user?._id, "$likes.likedBy"] },
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $project: {
        owner: 1,
        content: 1,
        likesCount: 1,
        isLiked: 1,
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
    throw new ApiError(401, "Unauthorized request");
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

const updateComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { commentId } = req.params;
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid or missing commentId");
  }
  if (!req.user || !isValidObjectId(req.user._id)) {
    throw new ApiError(401, "Unauthorized request");
  }
  if (!content?.trim()) {
    throw new ApiError(400, "Content cannot be empty");
  }
  try {
    const updatedComment = await Comment.findOneAndUpdate(
      {
        _id: commentId,
        owner: req.user._id,
      },
      {
        content: content,
      },
      {
        new: true,
      }
    );
    if (!updatedComment) {
      throw new ApiError(403, "Unauthorized request or comment does not exist");
    }
    return res
      .status(200)
      .json(
        new ApiResponse(200, updatedComment, "Comment updated successfully")
      );
  } catch (error) {
    throw new ApiError(
      error.status || 500,
      error.message || "Something went wrong while updating comment"
    );
  }
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid or missing commentId");
  }
  if (!req.user || !isValidObjectId(req.user._id)) {
    throw new ApiError(401, "Unauthorized request");
  }
  try {
    const deletedComment = await Comment.findOneAndDelete({
      _id: commentId,
      owner: req.user._id,
    });
    if (!deletedComment) {
      throw new ApiError(403, "Unauthorized request or comment does not exist");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Comment deleted successfully"));
  } catch (error) {
    throw new ApiError(
      error.status || 500,
      error.message || "Something went wrong while deleting comment"
    );
  }
});

export { getVideoComments, addComment, updateComment, deleteComment };
