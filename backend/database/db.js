import mongoose from "mongoose";
import "dotenv/config"

const connectDB = async () => {
    try {
        await mongoose.connect(`${process.env.MONGO_DB_URL}/${process.env.DB_NAME}`)  //local
        // await mongoose.connect(process.env.MONGO);    //atlas
        console.log(`Database connected`);
    } catch (error) {
        console.log("Error in connecting to database: ", error)
    }
}

export default connectDB;