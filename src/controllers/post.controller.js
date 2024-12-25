import mongoose, { isValidObjectId } from "mongoose";
import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPost = asyncHandler(async (req, res) => {
  //TODO: create Post
  const { content } = req.body;
  if (!req.user || !isValidObjectId(req.user._id)) {
    throw new ApiError(401, "Unauthorized request");
  }
  if (!content?.trim()) {
    throw new ApiError(400, "Content cannot be empty");
  }
  try {
    const post = await Post.create({
      owner: req.user._id,
      content,
    });
    if (!post) {
      throw new ApiError(500, "Failed to post");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, post, "Post created successfully"));
  } catch (error) {
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Something went wrong while creating post"
    );
  }
});

const getUserPosts = asyncHandler(async (req, res) => {
  // TODO: get user Posts
  const { userId } = req.params;
  if (!req.user || !isValidObjectId(req.user._id)) {
    throw new ApiError(401, "Unauthorized request");
  }
  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid userId");
  }
  try {
    const userPosts = await Post.aggregate([
      {
        $match: {
          owner: new mongoose.Types.ObjectId(userId),
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
          owner: { $first: "$owner" },
        },
      },
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "post",
          as: "likes",
          pipeline: [{ $project: { likedBy: 1 } }],
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
          content: 1,
          createdAt: 1,
          owner: 1,
          likesCount: 1,
          isLiked: 1,
        },
      },
    ]);
    if (!userPosts) {
      throw new ApiError(500, "Failed to fetch posts");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, userPosts, "Posts fetched successfully"));
  } catch (error) {
    throw new ApiError(500, "Failed to fetch posts");
  }
});

const updatePost = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { postId } = req.params;
  if (!isValidObjectId(postId)) {
    throw new ApiError(400, "Invalid or missing postId");
  }
  if (!req.user || !isValidObjectId(req.user._id)) {
    throw new ApiError(401, "Unauthorized request");
  }
  if (!content?.trim()) {
    throw new ApiError(400, "Content cannot be empty");
  }

  try {
    const updatedPost = await Post.findOneAndUpdate(
      {
        _id: postId,
        owner: req.user._id,
      },
      { content: content },
      { new: true }
    );

    if (!updatedPost) {
      throw new ApiError(403, "Unauthorized request or post does not exist");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, updatedPost, "Post updated successfully"));
  } catch (error) {
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Something went wrong while updating post"
    );
  }
});

const deletePost = asyncHandler(async (req, res) => {
  //TODO: delete Post
  const { postId } = req.params;
  if (!isValidObjectId(postId)) {
    throw new ApiError(400, "Invalid or missing postId");
  }
  if (!req.user || !isValidObjectId(req.user._id)) {
    throw new ApiError(401, "Unauthorized request");
  }
  try {
    const deletedPost = await Post.findOneAndDelete({
      _id: postId,
      owner: req.user._id,
    });

    if (!deletedPost) {
      throw new ApiError(403, "Unauthorized request or post does not exist");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Post deleted successfully"));
  } catch (error) {
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Something went wrong while deleting post"
    );
  }
});

export { createPost, getUserPosts, updatePost, deletePost };
