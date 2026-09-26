import mongoose from "mongoose";

const connectDB = async()=>{
    try {
        const connectionInstance = await mongoose.connect(`mongodb://127.0.0.1:27017/socialMediaAPI`)
        console.log(`MongoDB connected successfully at : ${connectionInstance.connection.port}`)
    } catch (error) {
        console.log(`MongoDB connection error : `,error)
        process.exit(1)
    }
}

export default connectDB