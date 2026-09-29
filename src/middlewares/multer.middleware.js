import multer from "multer";

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
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        cb(new ApiError(400, "Only image files are allowed!"), false);
    }
};

export const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB Limit
    fileFilter,
});