import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  //TODO: create playlist
  if (!req.user || !isValidObjectId(req.user._id)) {
    throw new ApiError(401, "Unauthorized request");
  }
  if (!name?.trim() || !description?.trim()) {
    throw new ApiError(400, "Name cannot be empty");
  }
  try {
    const playlist = await Playlist.create({
      name,
      description,
      owner: req.user._id,
    });
    if (!playlist) {
      throw new ApiError(500, "Failed to create playlist");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, playlist, "PlayList created successfully"));
  } catch (error) {
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Something went wrong while creating playlist"
    );
  }
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!req.user || !isValidObjectId(req.user._id)) {
    throw new ApiError(401, "Unauthorized request");
  }
  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid or missing userId");
  }
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User does not exits");
  }
  try {
    const userPlaylists = await Playlist.aggregate([
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
        $sort: { createdAt: -1 },
      },
      {
        $project: {
          name: 1,
          description: 1,
          createdAt: 1,
          owner: 1,
          videos: 1,
        },
      },
    ]);
    if (!userPlaylists) {
      throw new ApiError(500, "Failed to fetch playlists");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, userPlaylists, "PlayLists fetched successfully"));
  } catch (error) {
    throw new ApiError(500, "Failed to fetch playlists");
  }
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  //TODO: get playlist content by id

});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  //TODO: update playlist
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
