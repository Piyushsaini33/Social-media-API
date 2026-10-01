import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import swaggerUi from "swagger-ui-express"
import openApiSpec from "./docs/openapi.js"

const app = express()

//basic config
app.use(express.json({limit: "16kb"}))
//cors config
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))
app.use(cookieParser())

app.get("/api-docs.json", (req, res) => res.json(openApiSpec))
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiSpec))

// Import & Mount Routes
import userRouter from "./routes/user.routes.js";
import postRouter from "./routes/post.routes.js";

app.use("/api/v1/users", userRouter);
app.use("/api/v1/posts", postRouter);

//health check
app.get("/healthCheck",(req,res)=>{
    console.log(`API working fine`)
    return res.status(200).json("API is working fine")
})

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    statusCode,
    message: err.message || "Internal server error",
    errors: err.errors || [],
  });
});

export default app