import { Router } from "express";
import {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    getUserProfile,
    updateUserAvatar,
    searchUsers,
    toggleFollowUser,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// Public Routes
router.post("/register",upload.single("avatar"), registerUser);
router.post("/login", loginUser);
router.post("/refresh-token", refreshAccessToken);

// Secured Routes (Require JWT)
router.use(verifyJWT);

router.post("/logout", logoutUser);
router.get("/search", searchUsers);
router.get("/c/:username", getUserProfile);
router.post("/follow/:targetUserId", toggleFollowUser);

// Media Route (Multer file handling)
router.patch("/avatar", upload.single("avatar"), updateUserAvatar);

export default router;