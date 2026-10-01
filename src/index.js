import "dotenv/config"
import app from "./app.js"
import connectDB from "./db/dbConnect.js"

const PORT = process.env.PORT || 8000

connectDB()
.then(()=>{
    app.listen(PORT, ()=>{
    console.log(`Server running successfully at : ${PORT}`);
    console.log(`Swagger running successfully at : http://localhost:${PORT}/api-docs`);
    })
})
.catch(err => {
    console.log(`MongoDb connection error : ${err}`)
})




