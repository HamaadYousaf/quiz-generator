import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
    const { logout, user } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <nav className="bg-white shadow-md px-6 py-4 flex justify-between items-center">
            <h1
                className="text-xl font-bold text-blue-600 cursor-pointer"
                onClick={() => navigate("/")}
            >
                Quiz-Generator
            </h1>

            <div className="flex items-center gap-4">
                {user && (
                    <span className="text-gray-700 text-sm hidden sm:block">
                        {user.username || user.email}
                    </span>
                )}
                <button
                    onClick={handleLogout}
                    className="bg-red-500 text-white px-3 py-1 text-sm rounded hover:bg-red-600"
                >
                    Logout
                </button>
            </div>
        </nav>
    );
};

export default Navbar;
