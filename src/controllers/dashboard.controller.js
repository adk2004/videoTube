import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  if (!req.user || !req.user._id) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const channelId = req.user._id;
    const totalSubscribers = await Subscription.countDocuments({
      channel: channelId,
    });
    const [videoStats] = await Video.aggregate([
      {
        $match: { owner: channelId },
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
        $group: {
          _id: null,
          totalVideos: { $sum: 1 },
          totalViews: { $sum: "$views" },
          totalLikes: { $sum: { $size: "$likes" } },
        },
      },
      {
        $project: {
          totalVideos: { $ifNull: ["$totalVideos", 0] },
          totalLikes: { $ifNull: ["$totalLikes", 0] },
          totalViews: { $ifNull: ["$totalViews", 0] },
        },
      },
    ]);
    const stats = {
      totalSubscribers: totalSubscribers || 0,
      totalVideos: videoStats?.totalVideos || 0,
      totalLikes: videoStats?.totalLikes || 0,
      totalViews: videoStats?.totalViews || 0,
    };

    res
      .status(200)
      .json(
        new ApiResponse(200, stats, "Channel details fetched successfully")
      );
  } catch (error) {
    console.error("Error fetching channel stats:", error);
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Failed to fetch channel details"
    );
  }
});

const getChannelVideos = asyncHandler(async (req, res) => {
  // TODO: Get all the videos uploaded by the channel
  const { page = 1, limit = 10 } = req.query;
  if (!req.user || !req.user._id) {
    throw new ApiError(401, "Unauthorized request");
  }
  const pipeline = [
    {
      $match: {
        owner: req.user._id,
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
        createdAt: {
          $dateToString: {
            format: "%d-%m-%Y",
            date: "$createdAt",
          },
        },
        likesCount: {
          $size: "$likes",
        },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        _id: 1,
        videoFile: 1,
        thumbnail: 1,
        title: 1,
        description: 1,
        createdAt: 1,
        duration: 1,
        views: 1,
        likesCount: 1,
        isPublished: 1,
        likesCount: 1,
      },
    },
  ];
  try {
    const videos = await Video.aggregatePaginate(Video.aggregate(pipeline), {
      page: Number(page),
      limit: Number(limit),
    });
    return res
      .status(200)
      .json(new ApiResponse(200, videos, "Videos fetched successfully"));
  } catch (error) {
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Failed to fetch channel videos"
    );
  }
});

export { getChannelStats, getChannelVideos };
