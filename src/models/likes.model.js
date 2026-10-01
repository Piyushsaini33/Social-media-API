import mongoose, { Schema } from "mongoose";

const likeSchema = new mongoose.Schema(
    {
        post: {
            type: Schema.Types.ObjectId,
            ref: "Posts"
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: "User"
        }
    },
    {
        timestamps: true
    }
)

likeSchema.index({ post: 1, user: 1 }, { unique: true });

export const Like = mongoose.model("Like",likeSchema)