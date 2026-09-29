import mongoose, { Schema } from "mongoose";

const postSchema = new mongoose.Schema(
    {
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User",
            index: true,
        }, 
        caption: {
            type: String
        },
        image: {
            type: String
        },
        likesCount: {
            type: Number,
            default: 0
        },
        commentsCount: {
            type: Number,
            default: 0
        }
    },
    {
        timestamps: true
    }
)

export const Posts = mongoose.model("Posts",postSchema)