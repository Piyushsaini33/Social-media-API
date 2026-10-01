import multer from "multer";
import apiError from "../utils/apiError.util.js";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
      const uniquePreffix = Date.now()+'-'+Math.round(Math.random()*1E9)
      cb(null, uniquePreffix+'-'+file.originalname)
    }
  })
  
const fileFilter = (req, file, cb) => {
    // Only allow common image formats
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new apiError(400, "Only .jpg, .jpeg, and .png files are allowed!"), false);
    }
};

export const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB Limit
    fileFilter,
});