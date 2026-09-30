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

export const Like = mongoose.model("Like",likeSchema)