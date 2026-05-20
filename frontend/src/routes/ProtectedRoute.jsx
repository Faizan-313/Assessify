import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContextCore";
import toast from "react-hot-toast";

const ProtectedRoute = () => {
    const { user }  = useAuth();
    if(!user){
        toast.error("Please sign in to access this page")
    }
    return user ? <Outlet /> : <Navigate to="/signin" />
}

export default ProtectedRoute