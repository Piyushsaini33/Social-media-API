import mongoose from "mongoose";

const followSchema = new mongoose.Schema(
    {
        follower:{
            type: Schema.Types.ObjectId,
            ref: "User"
        },
        following:{
            type: Schema.Types.ObjectId,
            ref: "User"
        }
    },
    {
        timestamps: true
    }
)

export const Follow = mongoose.model("Follow",followSchema)