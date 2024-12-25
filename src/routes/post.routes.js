import { Router } from "express";
import {
  createPost,
  getUserPosts,
  updatePost,
  deletePost,
} from "../controllers/post.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT);

router.route("/").post(createPost);
router.route("/user/:userId").get(getUserPosts);
router.route("/:postId").patch(updatePost).delete(deletePost);

export default router;
