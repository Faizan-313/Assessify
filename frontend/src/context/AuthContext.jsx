import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { apiCall } from "../api/api";
import { AuthContext } from "./AuthContextCore";

const url = import.meta.env.VITE_API_URL;

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const clearUserState = () => {
        setUser(null);
        localStorage.removeItem("user");
    }

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if(storedUser){
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    },[]);

    const login = async (email, password) => {
        try {
            const response = await axios.post(
                `${url}/api/v1/auth/login`,
                { email, password },
                { withCredentials: true }
            );

            //for debugging
            console.log("Login response: ", response);
            localStorage.setItem("user", JSON.stringify(response));

            if (response.status === 200) {
                const loggedInUser = response.data.user;
                setUser(loggedInUser);
                localStorage.setItem("user", JSON.stringify(loggedInUser));
                toast.dismiss(); 
                toast.success("User Logged in successfully");
                return { success: true };
            }
        } catch (error) {
            toast.dismiss();
            toast.error(error.response?.data?.message || "Login failed")
            return { success: false }
        }
    }

    const register = async (name, email, password) => {
        try {
            const response = await axios.post(
                `${url}/api/v1/auth/register`,
                { name, email, password },
                { withCredentials: true }
            );

            if (response.status === 200) {
                toast.dismiss();
                toast.success("User Registered successfully");
                await login(email, password); // auto-login after registration
                return { success: true };
            }
        } catch (err) {
            toast.dismiss();
            toast.error(err.response?.data?.message || "Registration failed");
            return { success: false };
        }
    };

    const logout = async () => {
        try {
            const response = await apiCall(`${url}/api/v1/auth/logout`, "POST");
            if (response.status === 200) {
                clearUserState();
                toast.dismiss();
                toast.success("Logged out successfully");
                window.location.href = "/signin";
                return { success: true };
            }
        } catch (error) {
            toast.dismiss();
            toast.error(error.response?.data?.message || "logout failed");
            return { success: false };
        }
    }

    const value = {
        user,
        login,
        register,
        logout,
        loading
    }

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    )
}

