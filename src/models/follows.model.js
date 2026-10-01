import mongoose,{Schema} from "mongoose";

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

followSchema.index({ follower: 1, following: 1 }, { unique: true });

export const Follow = mongoose.model("Follow",followSchema)