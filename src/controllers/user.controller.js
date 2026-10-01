import asyncHandler from "../utils/asyncHandler.util.js";
import apiError from "../utils/apiError.util.js";
import apiResponse from "../utils/apiResponse.util.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import { Follow } from "../models/follows.model.js";
import mongoose from "mongoose";
import { uploadToCloudinary } from "../utils/cloudinary.util.js";

const generateAccessAndRefereshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new apiError(
      500,
      "Something went wrong while generating referesh and access token",
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    throw new apiError(400, "All fields are required");
  }

const avatarLocalPath = req.file?.path;
if (!avatarLocalPath) {
  throw new apiError(400, "Avatar file is required");
}

const avatar = await uploadToCloudinary(avatarLocalPath, "avatars");
if (!avatar?.secure_url) {
  throw new apiError(500, "Avatar upload failed");
}

  const existingUser = await User.findOne({ $or: [{ username }, { email }] });

  if (existingUser) {
    throw new apiError(409, "User with email or username already exists");
  }

  const user = await User.create({
    username,
    email,
    password,
    avatar: avatar.url,
  });

  if (!user) {
    throw new apiError(500, "Something went wrong while registering the user");
  }

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  return res
    .status(201)
    .json(new apiResponse(201, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;
  console.log(email);

  if (!username && !email) {
    throw new apiError(400, "username or email is required");
  }

  const user = await User.findOne({ $or: [{ username }, { email }] });

  if (!user) {
    throw new apiError(404, "User dont exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new apiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
    user._id,
  );

  await user.save({ validateBeforeSave: false });

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new apiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully",
      ),
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: { refreshToken: 1 },
    },
    {
      new: true,
    },
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new apiResponse(200, {}, "User logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new apiError(401, "Unauthorised request");
  }

  const decodedToken = jwt.verify(
    incomingRefreshToken,
    process.env.REFRESH_TOKEN_SECRET,
  );

  const user = await User.findById(decodedToken?._id);

  if (!user) {
    throw new apiError(401, "Invalid refresh token");
  }

  if (incomingRefreshToken !== user?.refreshToken) {
    throw new apiError(401, "Refresh token is expired or used");
  }

  const { accessToken, refreshToken: newRefreshToken } =
    await generateAccessAndRefereshTokens(user._id);

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
      new apiResponse(
        200,
        { accessToken, refreshToken: newRefreshToken },
        "Access token refreshed",
      ),
    );
});

const toggleFollowUser = asyncHandler(async (req, res) => {
  const { targetUserId } = req.params;

  // 1. Validate ID existence and format
  if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
    throw new apiError(400, "Invalid target user ID");
  }

  // 2. Prevent self-following
  if (req.user._id.toString() === targetUserId) {
    throw new apiError(400, "You cannot follow yourself");
  }

  // 3. Ensure target user exists
  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    throw new apiError(404, "Target user not found");
  }

  // 4. Check existing relationship
  const existingFollow = await Follow.findOne({
    follower: req.user._id,
    following: targetUserId,
  });

  if (existingFollow) {
    // UNFOLLOW: Delete the follow relationship
    await Follow.findByIdAndDelete(existingFollow._id);

    return res
      .status(200)
      .json(
        new apiResponse(
          200,
          { isFollowing: false },
          "User unfollowed successfully",
        ),
      );
  }

  // FOLLOW: Create the follow relationship
  await Follow.create({
    follower: req.user._id,
    following: targetUserId,
  });

  return res
    .status(200)
    .json(
      new apiResponse(200, { isFollowing: true }, "User followed successfully"),
    );
});

const getUserProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new apiError(400, "Username is required");
  }

  // 1. Fetch target user
  const user = await User.findOne({
    username: username.toLowerCase(),
  }).select("-password -refreshToken");

  if (!user) {
    throw new apiError(404, "User profile not found");
  }

  // 2. Parallelize DB queries for maximum throughput
  const [followersCount, followingCount, isFollowingRecord] = await Promise.all(
    [
      Follow.countDocuments({ following: user._id }), // People following profile user
      Follow.countDocuments({ follower: user._id }), // People profile user follows
      req.user
        ? Follow.exists({ follower: req.user._id, following: user._id })
        : null,
    ],
  );

  return res.status(200).json(
    new apiResponse(
      200,
      {
        user,
        followersCount,
        followingCount,
        isFollowing: Boolean(isFollowingRecord),
      },
      "User profile fetched successfully",
    ),
  );
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    // 1. Get file path from Multer (upload.single('avatar'))
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new apiError(400, "Avatar image file is required");
    }

    // 2. Upload to Cloudinary
    const avatarCloudinary = await uploadToCloudinary(avatarLocalPath, "avatars");

    if (!avatarCloudinary?.url) {
        throw new apiError(500, "Error while uploading avatar to Cloudinary");
    }

    // 3. Update authenticated user's avatar field directly
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar: avatarCloudinary.secure_url,
            },
        },
        { new: true }
    ).select("-password -refreshToken");

    return res
        .status(200)
        .json(new apiResponse(200, user, "Avatar updated successfully"));
});

const searchUsers = asyncHandler(async (req, res) => {
    const { query, page = 1, limit = 10 } = req.query;

    // 1. Validate query string
    if (!query || !query.trim()) {
        throw new apiError(400, "Search query is required");
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const cleanQuery = query.trim();

    const escapedQuery = cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // 2. Build search condition using case-insensitive regex ($options: "i")
    // Also exclude the currently logged-in user from the results
    const searchFilter = {
        _id: { $ne: req.user._id },
        username: { $regex: escapedQuery, $options: "i" }
    };

    // 3. Execute search & count queries in parallel
    const [users, totalUsers] = await Promise.all([
        User.find(searchFilter)
            .select("username avatar")
            .skip(skip)
            .limit(limitNum),
        User.countDocuments(searchFilter),
    ]);

    const totalPages = Math.ceil(totalUsers / limitNum);

    return res.status(200).json(
        new apiResponse(
            200,
            {
                users,
                pagination: {
                    totalUsers,
                    totalPages,
                    currentPage: pageNum,
                    limit: limitNum,
                    hasNextPage: pageNum < totalPages,
                },
            },
            "Users searched successfully"
        )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  toggleFollowUser,
  getUserProfile,
  updateUserAvatar,
  searchUsers
};
