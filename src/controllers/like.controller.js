import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: toggle like on video
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid or missing videoId");
  }
  if (!isValidObjectId(req.user?._id)) {
    throw new ApiError(401, "Unauthorized request");
  }
  try {
    const like = await Like.findOne({
      video: videoId,
      likedBy: req.user?._id,
    });
    if (like) {
      await Like.findByIdAndDelete(like._id);
    } else {
      await Like.create({
        video: videoId,
        likedBy: req.user?._id,
      });
    }
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Like toggled successfully"));
  } catch (error) {
    throw new ApiError(500, error.message || "Something went wrong");
  }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  //TODO: toggle like on comment
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid or missing commentId");
  }
  if (!isValidObjectId(req.user?._id)) {
    throw new ApiError(401, "Unauthorized request");
  }
  try {
    const like = await Like.findOne({
      comment: commentId,
      likedBy: req.user?._id,
    });
    if (like) {
      await Like.findByIdAndDelete(like._id);
    } else {
      await Like.create({
        comment: commentId,
        likedBy: req.user?._id,
      });
    }
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Like toggled successfully"));
  } catch (error) {
    throw new ApiError(500, error.message || "Something went wrong");
  }
});

const togglePostLike = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  //TODO: toggle like on post
  if (!isValidObjectId(postId)) {
    throw new ApiError(400, "Invalid or missing postId");
  }
  if (!isValidObjectId(req.user?._id)) {
    throw new ApiError(401, "Unauthorized request");
  }
  try {
    const like = await Like.findOne({
      post: postId,
      likedBy: req.user?._id,
    });
    if (like) {
      await Like.findByIdAndDelete(like._id);
    } else {
      await Like.create({
        post: postId,
        likedBy: req.user?._id,
      });
    }
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Like toggled successfully"));
  } catch (error) {
    throw new ApiError(500, error.message || "Something went wrong");
  }
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos
  if (!isValidObjectId(req.user?._id)) {
    throw new ApiError(401, "Unauthorized request");
  }
  const pipeline = [
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user._id),
        video: { $exists: true, $ne: null },
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
        pipeline: [
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
              owner: { $first: "$owner" },
            },
          },
          {
            $project: {
              title: 1,
              description: 1,
              owner: 1,
              thumbnail: 1,
              createdAt: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$video",
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        _id: "$video._id",
        title: "$video.title",
        description: "$video.description",
        owner: "$video.owner",
        thumbnail: "$video.thumbnail",
        createdAt: "$video.createdAt",
      },
    },
  ];
  try {
    const likedVideos = await Like.aggregate(pipeline);
    return res
      .status(200)
      .json(
        new ApiResponse(200, likedVideos, "Liked videos fetched successfully")
      );
  } catch (error) {
    throw new ApiError(
      500,
      error.message || "Something went wrong while fetching liked videos"
    );
  }
});

export { toggleCommentLike, togglePostLike, toggleVideoLike, getLikedVideos };
