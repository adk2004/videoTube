import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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
    throw new ApiError(400, "Email ,Username,FullName, Password all are required");
  }
  const existedUser = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (existedUser) {
    throw new ApiError(409, "This username or email id is already in use");
  }

  if(!req.files?.avatar[0]){
    throw new ApiError(400, "Avatar is required");
  }
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = (req.files?.coverImage)?req.files?.coverImage[0].path:"";
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

export { registerUser };
