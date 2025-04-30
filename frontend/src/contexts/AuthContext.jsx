import { createContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();

function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem("token") || null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

    useEffect(() => {
        if (token) {
            axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
            axios.get(`${API_URL}/me`)
                .then(res => setUser(res.data))
                .catch(() => logout())
                .finally(() => setLoading(false));
        } else {
            delete axios.defaults.headers.common["Authorization"];
            setLoading(false);
        }
    }, [API_URL, token]);

    const login = (newToken) => {
        localStorage.setItem("token", newToken);
        setToken(newToken);
    };

    const logout = () => {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ token, user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export { AuthProvider, AuthContext };