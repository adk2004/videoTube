import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";

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

const cookieOptions = {
  httpOnly: true,
  secure: true,
};

const oAuthCallback = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) {
    throw new ApiError(401, "Unauthorized request");
  }
  const { accessToken, refreshToken } = await generateAccessandRefreshTokens(
    user._id
  );
  // Save the refreshToken in the database
  user.refreshToken = refreshToken;
  await user.save();
  res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions);
  return res.redirect("/api/v1/users/current-user");
});

export { oAuthCallback };
