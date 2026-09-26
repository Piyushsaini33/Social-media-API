import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

//basic config
app.use(express.json({limit: "16kb"}))
//cors config
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))
app.use(cookieParser())

//health check
app.get("/healthCheck",(req,res)=>{
    console.log(`API working fine`)
})

export default app