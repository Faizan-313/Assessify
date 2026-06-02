import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken"

const isProduction = process.env.NODE_ENV === "production";

const options = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/"
}

const generateAccessAndRefreshToken = async (user) => {
    try {
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };

    } catch (error) {
        console.log("Error in generating tokens: ", error);
        return { error: "Failed to generate tokens" }
    }
}



const login = async (req, res)=>{
    try {
        const { email, password } = req.body;
        if([email,password].some((field)=> !field || field?.trim === "")){
            return res.status(400).json({ message: "All fields are required" })
        }

        const user = await User.findOne({ email: email.toLowerCase() })

        if(!user){
            return res.status(400).json({ message: "User not found" })
        }
        
        const checkPassword = await user.isPasswordCorrect(password);

        if(!checkPassword){
            return res.status(400).json({  message: "Invalid email or password" })
        }

        const tokens = await generateAccessAndRefreshToken(user);
        if(tokens.error){
            return res.status(500).json({ message: "Something went wrong" })
        }
        const { accessToken, refreshToken } = tokens;
        const loggedInUser = {
            _id: user._id,
            name: user.name,
            email: user.email
        }

        return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json({ user: loggedInUser })

    } catch (error) {
        console.log("Error in login: ", error);
        return res.status(500).json({ message: "Something went wrong" })
    }
}

const register = async (req, res)=>{
    try {
        const { name, email, password } = req.body;
        if([name, email, password].some((field)=> !field || field?.trim === "")){
            return res.status(400).json({ message: "All fields are required" })
        }
        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters long"
            });
        }

        const alreadyRegistered = await User.findOne({ email: email.toLowerCase() })
        if(alreadyRegistered){
            return res.status(409).json({ message: "Email already exists" })
        }

        const user = await User.create({
            name: name.toLowerCase(),
            email: email.toLowerCase(),
            password
        })

        const createdUser = await User.findById(user._id).select(
            "-password -refreshToken"
        )

        if(!createdUser){
            return res.status(500).json({ message: "Something went wrong" })
        }

        return res.status(200).json({ data: createdUser })

    } catch (error) {
        console.log("Error in register: ", error);
        return res.status(500).json({ message: "Something went wrong" })
    }
}

const logout = async (req, res)=>{
    try {
        await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                    refreshToken: undefined
                }
            },{
                new: true
            }
        )
        return res.status(200).clearCookie( 'accessToken', options ).clearCookie( 'refreshToken', options).json({ message: "Logged out successfully" });
    } catch (error) {
        console.log("Error in logout: ", error)
        return res.status(500).json({ message: "Something went wrong" })
    }
}

const refreshAccessToken = async (req, res) => {
    try {
        const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken;
        if (!incomingRefreshToken) {
            return res.status(401).json({ message: "Unauthorized request" });
        }
    
        const decodedToken = jwt.verify( incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET, { algorithm: "HS256" } )
        
        const user = await User.findById( decodedToken?._id )
        
        if(!user) {
            return res.status(401).json({ message: "invalid token" })
        }
    
        if( incomingRefreshToken !== user?.refreshToken ){
            return res.status(401).json({ message: "token is expired or used" })
        }

        // Atomically rotate the refresh token: this only succeeds if the incoming
        // token still matches what we have in the DB, which prevents two parallel
        // refresh calls from clobbering each other.
        const newAccessToken = jwt.sign(
            { _id: decodedToken._id, email: decodedToken.email },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
        );
        const newRefreshToken = jwt.sign(
            { _id: decodedToken._id },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
        );

        const updated = await User.findOneAndUpdate(
            { _id: decodedToken._id, refreshToken: incomingRefreshToken },
            { $set: { refreshToken: newRefreshToken } },
            { new: true }
        ).select("_id");

        if (!updated) {
            // Either the user doesn't exist or another concurrent refresh already rotated the token.
            return res.status(401).json({ message: "Token is expired or already used" });
        }

        return res.status(200)
            .cookie("accessToken", newAccessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
    } catch (error) {
        console.log("error in refreshing access token", error);
        return res.status(500).json({ message: "Something went wrong" });
    }
}

export {
    login,
    register,
    logout,
    refreshAccessToken
}