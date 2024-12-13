import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
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
    throw new ApiError(401,error?.message || "Invalid request")
  }
});

export { registerUser, loginUser, logoutUser, refreshAccessToken };
