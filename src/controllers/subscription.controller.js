import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  // TODO: toggle subscription
  if (!req.user || !req.user?._id) {
    throw new ApiError(401, "Unauthorized request");
  }
  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel id");
  }
  const subscriptionDoc = await Subscription.findOneAndDelete({
    subscriber: req.user._id,
    channel: channelId,
  });
  if (subscriptionDoc) {
    return res
      .status(201)
      .json(new ApiResponse(201, {}, "Unsubscribed successfully"));
  }
  const newSubscriptionDoc = await Subscription.create({
    subscriber: req.user._id,
    channel: channelId,
  });
  return res
    .status(201)
    .json(new ApiResponse(201, newSubscriptionDoc, "Subscribed successfully"));
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel id");
  }
  if (!req.user || !req.user._id) {
    throw new ApiError(401, "Unauthorized request");
  }
  const channel = await User.findById(channelId);
  if (!channel) {
    throw new ApiError(404, "Channel not found");
  }
  const subscribers = await Subscription.aggregate([
    {
      $match: { channel: mongoose.Types.ObjectId(channelId) },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscribers",
      },
    },
    {
      $unwind: "$subscribers",
    },
    {
      $project: {
        _id: "$subscribers._id",
        name: "$subscribers.name",
        email: "$subscribers.email",
        fullName: "$subscribers.fullName",
        avatar: "$subscribers.avatar",
        coverImage: "$subscribers.coverImage",
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribers,
        "Subscriber list retrieved successfully"
      )
    );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
  if (!isValidObjectId(subscriberId)) {
    throw new ApiError(400, "Invalid subscriber id");
  }
  if (!req.user || !req.user._id) {
    throw new ApiError(401, "Unauthorized request");
  }
  const subscriber = await User.findById(subscriberId);
  if (!subscriber) {
    throw new ApiError(404, "Subscriber not found");
  }
  const channelsSubscribedTo = await Subscription.aggregate([
    {
      $match: { subscriber: mongoose.Types.ObjectId(subscriberId) },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channels",
      },
    },
    {
      $unwind: "$channels",
    },
    {
      $project: {
        _id: "$channels._id",
        name: "$channels.name",
        email: "$channels.email",
        fullName: "$channels.fullName",
        avatar: "$channels.avatar",
        coverImage: "$channels.coverImage",
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        channelsSubscribedTo,
        "Subscribed channels retrieved successfully"
      )
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
