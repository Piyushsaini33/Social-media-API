import mongoose, { Schema } from "mongoose";

const commentSchema = new mongoose.Schema(
    {
        post: {
            type: Schema.Types.ObjectId,
            ref: "Posts",
            index: true,
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: "User"
        },
        content: {
            type: String
        }
    },
    {
        timestamps: true
    }
)

export const Comment = mongoose.model("Comment",commentSchema)