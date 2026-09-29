import { Posts } from "../models/posts.model.js";
import ApiError from "../utils/apiError.util.js";
import ApiResponse from "../utils/apiResponse.util.js";
import asyncHandler from "../utils/asyncHandler.util.js";
import { uploadToCloudinary } from "../utils/cloudinary.util.js";

const createPost = asyncHandler(async (req, res) => {
    const { caption } = req.body;
    const imageLocalPath = req.file?.path;

    // 1. Validation: Post must contain either a caption or an image
    if (!caption?.trim() && !imageLocalPath) {
        throw new ApiError(400, "Post must contain either a caption or an image");
    }

    let imageUrl = "";

    // 2. Upload image to Cloudinary if file was provided
    if (imageLocalPath) {
        const cloudinaryResponse = await uploadToCloudinary(imageLocalPath, "posts");
        if (!cloudinaryResponse) {
            throw new ApiError(500, "Failed to upload post image to Cloudinary");
        }
        imageUrl = cloudinaryResponse.secure_url;
    }

    // 3. Create Post linked to req.user._id (from verifyJWT middleware)
    const post = await Posts.create({
        owner: req.user._id,
        caption: caption?.trim() || "",
        image: imageUrl,
    });

    return res
        .status(201)
        .json(new ApiResponse(201, post, "Post created successfully"));
});

export { createPost };