import jwt from "jsonwebtoken"

const authenticateToken = (req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "").trim();
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, { algorithm: "HS256" });
        req.user = decodedToken;
        next();
    } catch (error) {
        // console.error("Error in auth middleware");
        return res.status(401).json({ message: 'Invalid token' });
    }
}

export default authenticateToken
