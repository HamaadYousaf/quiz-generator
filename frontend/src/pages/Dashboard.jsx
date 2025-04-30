import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";

const Dashboard = () => {
    const { token, user } = useContext(AuthContext);
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    const navigate = useNavigate();

    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

    useEffect(() => {
        const fetchQuizzes = async () => {
            try {
                const res = await axios.get(`${API_URL}/my-quizzes`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setQuizzes(res.data.quizzes);
            } catch (err) {
                setErrorMsg("Failed to load quizzes.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (token) fetchQuizzes();
    }, [API_URL, token]);

    const handleView = (id) => navigate(`/quiz/${id}`);
    const handleEdit = (id) => navigate(`/edit-quiz/${id}`);
    const handleDelete = async (id) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this quiz?");
        if (!confirmDelete) return;

        try {
            await axios.delete(`${API_URL}/quiz/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            // Remove from state immediately
            setQuizzes((prev) => prev.filter((quiz) => quiz.id !== id));
        } catch (err) {
            alert("Failed to delete quiz.");
            console.error(err);
        }
    };

    const handleCreateQuiz = () => navigate("/upload");

    return (
        <>
            <Navbar />

            <div className="min-h-screen bg-gray-100 px-4 py-8">
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-2xl font-bold text-gray-800">
                            Welcome, {user?.username || "User"}
                        </h1>
                        <button
                            onClick={handleCreateQuiz}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition text-sm"
                        >
                            + Create Quiz
                        </button>
                    </div>

                    {loading ? (
                        <p className="text-center text-gray-500">Loading quizzes...</p>
                    ) : errorMsg ? (
                        <div className="bg-red-100 text-red-600 p-3 rounded text-sm text-center">
                            {errorMsg}
                        </div>
                    ) : quizzes.length === 0 ? (
                        <p className="text-center text-gray-500">You haven't created any quizzes yet.</p>
                    ) : (
                        <div className="space-y-4">
                            {quizzes.map((quiz) => (
                                <div
                                    key={quiz.id}
                                    className="bg-white shadow-md rounded-lg p-4 flex justify-between items-center"
                                >
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-800">{quiz.title}</h2>
                                        <p className="text-sm text-gray-500">
                                            Created on {new Date(quiz.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleView(quiz.id)}
                                            className="bg-blue-600 text-white text-sm px-3 py-1 rounded hover:bg-blue-700"
                                        >
                                            View
                                        </button>
                                        <button
                                            onClick={() => handleEdit(quiz.id)}
                                            className="bg-yellow-500 text-white text-sm px-3 py-1 rounded hover:bg-yellow-600"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(quiz.id)}
                                            className="bg-red-600 text-white text-sm px-3 py-1 rounded hover:bg-red-700"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default Dashboard;
