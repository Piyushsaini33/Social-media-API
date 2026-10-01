import { Router } from "express";
import { createPost, getFeedPosts, togglePostLike, addComment  } from "../controllers/post.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// All post routes require authentication
router.use(verifyJWT);

router.route("/")
    .get(getFeedPosts)
    .post(upload.single("image"), createPost);

router.post("/:postId/like", togglePostLike);
router.post("/:postId/comment", addComment);

export default router;