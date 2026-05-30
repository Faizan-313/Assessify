import jwt from "jsonwebtoken"

const authenticateTempToken = (req, res, next) => {
    try {
        const token = req.cookies?.tempToken;
        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const decoded = jwt.verify(token, process.env.TEMP_TOKEN_SECRET, { algorithm: "HS256" });
        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};


export default authenticateTempToken