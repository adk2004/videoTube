import { Router } from "express";
import {
  loginUser,
  logoutUser,
  registerUser,
  refreshAccessToken,
  updateCurrentPassword,
  getCurrentUser,
  updateUserDetails,
  updateAvatarImage,
  updateCoverImage,
  getUserChannelDetails,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.route("/login").post(loginUser);

// secured routes : login required

router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/user/password").patch(verifyJWT, updateCurrentPassword);
router.route("/user").get(verifyJWT, getCurrentUser);
router.route("/user/details").patch(verifyJWT, updateUserDetails);

router
  .route("/user/avatar")
  .patch(verifyJWT, upload.single("avatar"), updateAvatarImage);
router
  .route("/user/cover-image")
  .patch(verifyJWT, upload.single("coverImage"), updateCoverImage);

router.route("/user/channel-details").get(verifyJWT, getUserChannelDetails);

export default router;
