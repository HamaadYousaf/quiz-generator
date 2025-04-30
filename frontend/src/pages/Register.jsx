import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Register = () => {
    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg("");

        try {
            await axios.post(`${API_URL}/register`, { username, email, password });
            navigate("/login");
        } catch (err) {
            setErrorMsg(err.response?.data?.detail || "Registration failed.");
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
            <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
                <h1 className="text-2xl font-bold text-center text-gray-800 mb-4">Create an Account</h1>

                {errorMsg && (
                    <div className="bg-red-100 text-red-600 px-3 py-2 rounded mb-4 text-sm">
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Username</label>
                        <input
                            type="text"
                            className="w-full mt-1 px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                            type="email"
                            className="w-full mt-1 px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <input
                            type="password"
                            className="w-full mt-1 px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                    >
                        Register
                    </button>
                </form>

                <p className="text-sm text-center text-gray-500 mt-6">
                    Already have an account?{" "}
                    <a href="/login" className="text-blue-600 hover:underline">
                        Log in here
                    </a>
                </p>
            </div>
        </div>
    );
};

export default Register;
