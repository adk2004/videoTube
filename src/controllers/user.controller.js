import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const cookieOptions = {
  httpOnly: true,
  secure: true,
};

const generateAccessandRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh tokens"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // get user details from rq body
  // validation - not empty
  //check duplicay for email, username
  // check for images avatar(compulsory)
  //upload imag eto cloudinary, avatar
  //create user object -- create enrty in DB
  // insert into DB
  // remove password and refresh token field from response
  // return response

  const { fullName, email, username, password } = req.body;
  // console.log("Full Name : ", fullName);
  // console.log("Email : ", email);

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(
      400,
      "Email ,Username,FullName, Password all are required"
    );
  }
  const existedUser = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (existedUser) {
    throw new ApiError(409, "This username or email id is already in use");
  }

  if (!req.files?.avatar) {
    throw new ApiError(400, "Avatar is required");
  }
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage
    ? req.files?.coverImage[0].path
    : "";
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    username: username.toLowerCase(),
    password,
  });
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "Something went Wrong while creating the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registered Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // get loggin data email password from req.body
  // verify email password
  // find user
  // authentication using email password
  // access and refresh token
  // send cookies
  const { username, email, password } = req.body;
  if (!username && !email) {
    throw new ApiError(400, "Email or Username is required");
  }
  const user = await User.findOne({
    $or: [
      { username: username?.toLowerCase() },
      { email: email?.toLowerCase() },
    ],
  });
  if (!user) {
    throw new ApiError(401, "User does not exist");
  }
  const isValidPassword = await user.isPasswordCorrect(password);
  if (!isValidPassword) {
    throw new ApiError(401, "Invalid Credentials");
  }
  const { accessToken, refreshToken } = await generateAccessandRefreshTokens(
    user._id
  );
  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        { accessToken, refreshToken },
        "User logged in Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  if (!req.user || !req.user._id) {
    throw new ApiError(401, "User is not authenticated");
  }
  const result = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: null }, // note udefined does not work here
    },
    {
      new: true,
    }
  );
  res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "User loggegOut Successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized Request");
  }
  try {
    const decodedRefreshToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedRefreshToken._id);
    if (!user) {
      throw new ApiError(404, "Invalid Refresh Token");
    }
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError();
    }
    const { newAccessToken, newRefreshToken } =
      await generateAccessandRefreshTokens(user._id);
    return res
      .status(200)
      .cookie("accessToken", newAccessToken, cookieOptions)
      .cookie("refreshToken", newRefreshToken, cookieOptions)
      .json(
        new ApiResponse(
          200,
          { accessToken: newAccessToken, refreshToken: newRefreshToken },
          "Tokens refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid request");
  }
});

const updateCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(401, "Invalid Update request");
  }
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(401, "Incorect old password");
  }
  user.password = newPassword;
  const updatedUser = await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Updated successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User Details fetched Successfully"));
});

const updateUserDetails = asyncHandler(async (req, res) => {
  const { email, fullName } = req.body;
  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorized request");
  }
  if (!email || !fullName) {
    throw new ApiError(401, "All fields are required");
  }
  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { email, fullName },
    },
    {
      runValidators: true,
      new: true,
    }
  ).select("-password -refreshToken");
  if (!updatedUser) {
    throw new ApiError(404, "User not found");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedUser, "User DetailsUpdated successfully")
    );
});

const updateAvatarImage = asyncHandler(async (req, res) => {
  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorized request");
  }
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }

  const newAvatar = await uploadOnCloudinary(avatarLocalPath);
  if (!newAvatar.url) {
    throw new ApiError(400, "Error while uploading on avatar");
  }

  // delete old image
  const oldUrl = req.user.avatar;

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { avatar: newAvatar.url },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");
  if (!updatedUser) {
    throw new ApiError(404, "User not found");
  }
  const result = await deleteFromCloudinary(oldUrl);
  if (!result) {
    throw new ApiError(500, "Error while deleting old avatar image file");
  }
  res
    .status(200)
    .json(
      new ApiResponse(200, updatedUser, "Avatar Image Updated successfully")
    );
});

const updateCoverImage = asyncHandler(async (req, res) => {
  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorized request");
  }
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover Image is required");
  }
  const newCoverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!newCoverImage.url) {
    throw new ApiError(500, "Error while uploading cover image");
  }
  // delete old image
  const oldUrl = req.user.coverImage;

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { coverImage: newCoverImage.url },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");
  if (!updatedUser) {
    throw new ApiError(404, "User not found");
  }

  const result = await deleteFromCloudinary(oldUrl);
  if (!result) {
    throw new ApiError(500, "Error while deleting old cover image file");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, updatedUser, "Cover Image Updated successfully")
    );
});

const getUserChannelDetails = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) {
    throw new ApiError(400, "Username is missing");
  }
  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        subscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        email: 1,
        subscribersCount: 1,
        subscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
      },
    },
  ]);
  if (!channel?.length) {
    throw new ApiError(404, "Channel Does not exists");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully")
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  updateCurrentPassword,
  getCurrentUser,
  updateUserDetails,
  updateAvatarImage,
  updateCoverImage,
  getUserChannelDetails,
};
