import axios from "axios";

// Single-flight refresh: if many requests 401 at the same time we don't want
// each of them to fire its own /refresh-token call. They all await the same
// promise.
let refreshPromise = null;

// Once we've decided the session is unrecoverable we stop trying. Any subsequent
// 401 just throws immediately so we don't loop on /refresh-token.
let sessionEnded = false;

const refreshTokenOnce = () => {
    if (!refreshPromise) {
        refreshPromise = axios
            .post(
                `${import.meta.env.VITE_API_URL}/api/v1/auth/refresh-token`,
                {},
                { withCredentials: true }
            )
            .finally(() => {
                refreshPromise = null;
            });
    }
    return refreshPromise;
};

const endSession = () => {
    if (sessionEnded) return;
    sessionEnded = true;

    try {
        localStorage.removeItem("user");
    } catch {
        /* ignore storage errors (private mode, etc.) */
    }

    // Avoid redirecting to /signin if we're already there.
    if (typeof window !== "undefined" && window.location.pathname !== "/signin") {
        window.location.href = "/signin";
    }
};

export const apiCall = async (url, method, options = {}) => {
    try {
        const res = await axios({
            url,
            method,
            withCredentials: true,
            ...options,
        });
        return res;
    } catch (error) {
        if (error.response?.status === 401) {
            if (sessionEnded) {
                throw error;
            }

            try {
                const refreshTokenRes = await refreshTokenOnce();
                if (refreshTokenRes.status === 200) {
                    return await axios({
                        url,
                        method,
                        withCredentials: true,
                        ...options,
                    });
                }else{
                    endSession();
                }
            } catch (refreshErr) {
                void refreshErr;
                endSession();
            }
        }

        throw error;
    }
};
