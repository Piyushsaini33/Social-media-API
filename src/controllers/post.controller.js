import { Comment } from "../models/comments.model.js";
import { Like } from "../models/likes.model.js";
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

const togglePostLike = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    // 1. Validate ID format
    if (!mongoose.Types.ObjectId.isValid(postId)) {
        throw new ApiError(400, "Invalid Post ID");
    }

    // 2. Ensure Post exists
    const post = await Posts.findById(postId);
    if (!post) {
        throw new ApiError(404, "Post not found");
    }

    // 3. Check if user already liked this post
    const existingLike = await Like.findOne({
        post: postId,
        user: req.user._id,
    });

    if (existingLike) {
        // UNLIKE: Remove like document and decrement count
        await existingLike.deleteOne();

        await Posts.findByIdAndUpdate(postId, {
            $inc: { likesCount: -1 },
        });

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { isLiked: false },
                    "Post unliked successfully"
                )
            );
    }

    // LIKE: Create like document and increment count
    await Like.create({
        post: postId,
        user: req.user._id,
    });

    await Posts.findByIdAndUpdate(postId, {
        $inc: { likesCount: 1 },
    });

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                { isLiked: true },
                "Post liked successfully"
            )
        );
});

const addComment = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { content } = req.body;

    // 1. Validate parameters
    if (!mongoose.Types.ObjectId.isValid(postId)) {
        throw new ApiError(400, "Invalid Post ID");
    }

    if (!content?.trim()) {
        throw new ApiError(400, "Comment content cannot be empty");
    }

    // 2. Ensure Post exists
    const post = await Posts.findById(postId);
    if (!post) {
        throw new ApiError(404, "Post not found");
    }

    // 3. Create comment
    const comment = await Comment.create({
        post: postId,
        user: req.user._id,
        content: content.trim(),
    });

    // 4. Increment comments count on Post
    await Posts.findByIdAndUpdate(postId, {
        $inc: { commentsCount: 1 },
    });

    return res
        .status(201)
        .json(new ApiResponse(201, comment, "Comment posted successfully"));
});



export { createPost,togglePostLike,addComment };