import { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";
import { AuthContext } from "../contexts/AuthContext";


const EditQuiz = () => {
    const { quiz_id } = useParams();
    const { token } = useContext(AuthContext);
    const navigate = useNavigate();

    const [title, setTitle] = useState("");
    const [mcQuestions, setMcQuestions] = useState([]);
    const [tfQuestions, setTfQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");

    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

    useEffect(() => {
        const fetchQuiz = async () => {
            try {
                const res = await axios.get(`${API_URL}/quiz/${quiz_id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                const quiz = res.data.quiz;
                setTitle(quiz.title);
                setMcQuestions(quiz.mc_questions || []);
                setTfQuestions(quiz.tf_questions || []);
            } catch (err) {
                setErrorMsg("Failed to load quiz.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchQuiz();
    }, [API_URL, quiz_id, token]);

    const handleSave = async () => {
        try {
            await axios.patch(
                `${API_URL}/quiz/${quiz_id}`,
                {
                    title,
                    mc_questions: mcQuestions,
                    tf_questions: tfQuestions,
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            navigate("/"); // Go back to dashboard after save
        } catch (err) {
            alert("Failed to update quiz.");
            console.error(err);
        }
    };

    return (
        <>
            <Navbar />
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
                <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-3xl">
                    <h2 className="text-xl font-bold mb-4">Edit Quiz</h2>

                    {errorMsg && (
                        <div className="bg-red-100 text-red-600 p-2 rounded mb-4">{errorMsg}</div>
                    )}

                    {loading ? (
                        <p className="text-gray-500">Loading...</p>
                    ) : (
                        <>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700">Title</label>
                                <input
                                    type="text"
                                    className="w-full mt-1 px-3 py-2 border rounded-md shadow-sm"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>

                            <div className="mb-4">
                                <h3 className="font-semibold text-gray-800 mb-2">Multiple Choice Questions</h3>
                                {mcQuestions.map((q, i) => (
                                    <div key={i} className="mb-3 space-y-1">
                                        <input
                                            className="w-full px-2 py-1 border rounded"
                                            value={q.question}
                                            onChange={(e) =>
                                                setMcQuestions((prev) => {
                                                    const updated = [...prev];
                                                    updated[i].question = e.target.value;
                                                    return updated;
                                                })
                                            }
                                        />
                                        {q.options.map((opt, idx) => (
                                            <input
                                                key={idx}
                                                className="w-full px-2 py-1 border rounded"
                                                value={opt}
                                                onChange={(e) =>
                                                    setMcQuestions((prev) => {
                                                        const updated = [...prev];
                                                        updated[i].options[idx] = e.target.value;
                                                        return updated;
                                                    })
                                                }
                                            />
                                        ))}
                                        <input
                                            className="w-full px-2 py-1 border rounded"
                                            value={q.answer}
                                            onChange={(e) =>
                                                setMcQuestions((prev) => {
                                                    const updated = [...prev];
                                                    updated[i].answer = e.target.value;
                                                    return updated;
                                                })
                                            }
                                            placeholder="Correct Answer"
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="mb-6">
                                <h3 className="font-semibold text-gray-800 mb-2">True/False Questions</h3>
                                {tfQuestions.map((q, i) => (
                                    <div key={i} className="mb-2 space-y-1">
                                        <input
                                            className="w-full px-2 py-1 border rounded"
                                            value={q.statement}
                                            onChange={(e) =>
                                                setTfQuestions((prev) => {
                                                    const updated = [...prev];
                                                    updated[i].statement = e.target.value;
                                                    return updated;
                                                })
                                            }
                                        />
                                        <select
                                            className="w-full px-2 py-1 border rounded"
                                            value={q.answer}
                                            onChange={(e) =>
                                                setTfQuestions((prev) => {
                                                    const updated = [...prev];
                                                    updated[i].answer = e.target.value;
                                                    return updated;
                                                })
                                            }
                                        >
                                            <option value="True">True</option>
                                            <option value="False">False</option>
                                        </select>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={handleSave}
                                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                            >
                                Save Changes
                            </button>
                        </>
                    )}
                    {/* Home Button */}
                    <div className="flex justify-center mt-6">
                        <button
                            onClick={() => navigate("/")}
                            className="text-sm text-blue-600 hover:underline"
                        >
                            ← Back to Dashboard
                        </button>
                    </div>
                </div >
            </div >
        </>
    );
};

export default EditQuiz;
