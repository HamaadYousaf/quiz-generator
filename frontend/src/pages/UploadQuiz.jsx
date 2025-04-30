import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";
import { AuthContext } from "../contexts/AuthContext";

const UploadQuiz = () => {
    const { token } = useContext(AuthContext);
    const navigate = useNavigate();

    const [file, setFile] = useState(null);
    const [title, setTitle] = useState("");
    const [numMcq, setNumMcq] = useState(5);
    const [numTf, setNumTf] = useState(5);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg("");

        if (!file) {
            setErrorMsg("Please upload a PDF file.");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("title", title);
        formData.append("num_mcq", numMcq);
        formData.append("num_tf", numTf);

        setLoading(true);
        try {
            await axios.post(`${API_URL}/generate-questions`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data",
                },
            });
            navigate("/");
        } catch (err) {
            setErrorMsg(err.response?.data?.detail || "Failed to generate quiz.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Navbar />
            <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-12">
                <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-lg">
                    <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">Upload a PDF to Create a Quiz</h1>

                    {errorMsg && (
                        <div className="bg-red-100 text-red-600 p-3 rounded mb-4 text-sm text-center">
                            {errorMsg}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Quiz Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full mt-1 px-3 py-2 border rounded-md shadow-sm"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">PDF File</label>
                            <input
                                type="file"
                                accept="application/pdf"
                                onChange={(e) => setFile(e.target.files[0])}
                                className="w-full mt-1"
                                required
                            />
                        </div>

                        <div className="flex gap-4">
                            <div className="w-1/2">
                                <label className="block text-sm font-medium text-gray-700"># MCQs</label>
                                <input
                                    type="number"
                                    value={numMcq}
                                    onChange={(e) => setNumMcq(parseInt(e.target.value))}
                                    className="w-full mt-1 px-2 py-1 border rounded"
                                    min={0}
                                    max={20}
                                />
                            </div>
                            <div className="w-1/2">
                                <label className="block text-sm font-medium text-gray-700"># True/False</label>
                                <input
                                    type="number"
                                    value={numTf}
                                    onChange={(e) => setNumTf(parseInt(e.target.value))}
                                    className="w-full mt-1 px-2 py-1 border rounded"
                                    min={0}
                                    max={20}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                        >
                            {loading ? "Generating..." : "Generate Quiz"}
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
};

export default UploadQuiz;
