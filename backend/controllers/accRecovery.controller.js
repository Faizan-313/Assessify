import { User } from "../models/user.model.js";
import { AuthReset } from "../models/AuthReset.model.js";
import generateRandomNumber from "../utils/randomNumberGenerator.utils.js";
import bcrypt from "bcrypt"
import { sendEmail } from "../config/nodemailer.config.js";
import jwt from "jsonwebtoken";

const isProduction = process.env.NODE_ENV === "production";

const options = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 10 * 60 * 1000,
    path: "/"
}

// verify email and send the reset code in email
const verifyEmail = async (req, res) => {
    try {
        const {email} = req.body;
        if(!email || email.trim() == ""){
            return res.status(400).json({ message: "Email is required" });
        }
        const user = await User.findOne({ email: email.toLowerCase() }).select("-password -refreshToken -examsCreated -createdAt -updatedAt");
        if(!user){
            return res.status(400).json({ message: "We count not find any account linked to this email" })
        }

         // Remove old reset requests
        await AuthReset.findOneAndDelete({ userId: user._id })

        const resetCode = generateRandomNumber().toString();

        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        const resetCodeHash = await bcrypt.hash(resetCode, 10);

        const tempToken = jwt.sign({
            _id: user._id,
            email: user.email
        },
        process.env.TEMP_TOKEN_SECRET,
        {
            algorithm: "HS256",
            expiresIn: "5m"
        })

        await AuthReset.create({
            userId: user._id,
            resetCodeHash: resetCodeHash,
            expiresAt: expiresAt
        })

        const emailResult = await sendEmail({
            to: user.email,
            subject: "Reset Verification Code",
            text: `Hello ${user.name},
                Your reset verification code is : ${resetCode}.`,
            html: `<p>Hello <strong>${user.name}</strong>
                <p>Your reset verification code is: <strong>${resetCode}</strong></p>
                <p>The code will expire in <strong>5 minutes</strong></p>`
        });

        if (!emailResult.success) {
            return res.status(500).json({ 
                message: "Could not send the mail. Please email us for further assistance."
            });
        }

        return res.status(200)
            .cookie("tempToken", tempToken, options)
            .json({ message: `Reset code sent on ${user.email}` })

    } catch (error) {
        console.log("Error in verifying email: ", error)
        return res.status(500).json({ message: "Something went wrong" })
    }
}

//verify the reset code 
const verifyResetCode = async (req, res) =>{
    try {
        const { code } = req.body;
        if(!code || !/^\d{6}$/.test(code)){
            return res.status(400).json({ message: "Invalid verification code" });
        }
        
        const MAX_ATTEMPTS = 5;

        const resetDetails = await AuthReset.findOne({
            userId: req.user._id,
            isUsed: false,
            attempts: { $lt: MAX_ATTEMPTS }
        });

        const providedHash = resetDetails.resetCodeHash || "dummy_hash_9a7f3c2b8e4d1f6a"
        const isValid = await bcrypt.compare(code, providedHash);

        if (!resetDetails) {
            return res.status(400).json({ message: "Invalid or expired code" });
        }

        if (resetDetails.expiresAt < Date.now()) {
            return res.status(400).json({ message: "Invalid or expired code" });
        }

        
        if (!isValid) {
            resetDetails.attempts += 1;
            await resetDetails.save();
            return res.status(400).json({ message: "Invalid code" });
        }

        resetDetails.isUsed = true;
        await resetDetails.save();

        return res.status(200).json({ message: "Verification successful" });
    } catch (error) {
        console.log("Error in verifying reset code: ", error)
        return res.status(500).json({ message: "Something went wrong" })
    }
}

//update db with new password
const resetPassword = async (req, res) => {
    try {
        const { password } = req.body;

        if (!password || password.trim() === "") {
            return res.status(400).json({ message: "Password is required" });
        }

        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters long"
            });
        }

        // check reset record
        const resetDetails = await AuthReset.findOne({
            userId: req.user._id,
            isUsed: true
        });

        if (!resetDetails) {
            return res.status(400).json({
                message: "Password reset, not authorized or session expired"
            });
        }

        const user = await User.findById(req.user._id);
        user.password = password;
        await user.save();


        // cleanup reset record
        await AuthReset.deleteMany({ userId: req.user._id });

        // clear temp cookie
        res.clearCookie("tempToken", options);

        return res.status(200).json({
            message: "Password updated successfully. Please sign in again."
        });

    } catch (error) {
        console.log("Error in resetting password:", error);
        return res.status(500).json({ message: "Something went wrong" });
    }
}

export {
    verifyEmail,
    verifyResetCode,
    resetPassword
}