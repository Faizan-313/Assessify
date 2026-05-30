import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt"

const TeacherSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: { 
        type: String,
        required: true,
        unique: true,
        index: true
    },
    password: {
        type: String,
        required: true
    },
    examsCreated: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Exam",
            default: [],
        },
    ],
    refreshToken: {
        type: String,
    }
},{
    timestamps: true
});

TeacherSchema.pre("save", async function (next){
    if(this.isModified("password")){
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

// Add indexes for frequently queried fields
TeacherSchema.index({ name: 1 });
TeacherSchema.index({ createdAt: -1 });

TeacherSchema.methods.isPasswordCorrect = async function (password){
    return await bcrypt.compare(password, this.password);
}

TeacherSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            email: this.email
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            algorithm: "HS256",
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

TeacherSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            algorithm: "HS256",
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("Teacher", TeacherSchema);