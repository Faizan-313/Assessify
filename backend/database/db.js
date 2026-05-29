import mongoose from "mongoose";
import "dotenv/config"

const DB_URL = process.env.NODE_ENV === "dev" ? `${process.env.MONGO_DB_URL}/${process.env.DB_NAME}` : process.env.MONGO;

const connectDB = async () => {
    try {
        await mongoose.connect(DB_URL);
        console.log(`Database connected`);
    } catch (error) {
        console.log("Error in connecting to database: ", error)
    }
}

export default connectDB;