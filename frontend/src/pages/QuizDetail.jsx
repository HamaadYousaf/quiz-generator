import { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import axios from "axios";
import Navbar from "../components/Navbar";

const QuizDetail = () => {
    const { quiz_id } = useParams();
    const { token } = useContext(AuthContext);
    const [quiz, setQuiz] = useState(null);
    const [errorMsg, setErrorMsg] = useState("");
    const [currentIndex, setCurrentIndex] = useState(0);
    const [flipped, setFlipped] = useState(false);
    const navigate = useNavigate();

    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

    useEffect(() => {
        const fetchQuiz = async () => {
            try {
                const res = await axios.get(`${API_URL}/quiz/${quiz_id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setQuiz(res.data.quiz);
            } catch (err) {
                setErrorMsg("Failed to load quiz.");
                console.error(err);
            }
        };

        if (token) fetchQuiz();
    }, [token, quiz_id, API_URL]);

    const allQuestions = quiz
        ? [...(quiz.mc_questions || []), ...(quiz.tf_questions || [])]
        : [];

    const handleNext = () => {
        setFlipped(false);
        setCurrentIndex((prev) => Math.min(prev + 1, allQuestions.length - 1));
    };

    const handleBack = () => {
        setFlipped(false);
        setCurrentIndex((prev) => Math.max(prev - 1, 0));
    };

    const current = allQuestions[currentIndex];
    const isMCQ = current && current.options;

    return (
        <>
            <Navbar />
            <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4 pt-8">
                {errorMsg && <p className="text-red-600 mb-4">{errorMsg}</p>}

                {!quiz ? (
                    <p className="text-gray-500">Loading quiz...</p>
                ) : (
                    <div className="w-full max-w-xl">
                        <h1 className="text-center text-xl font-bold text-gray-800 mb-6">
                            {quiz.title}
                        </h1>

                        {/* Flashcard */}
                        <div
                            className={`relative bg-white h-48 sm:h-56 md:h-64 w-full rounded-xl shadow-md transition-transform duration-500 flex items-center justify-center text-center px-6 py-4 ${flipped ? "rotate-y-180" : ""}`}
                            onClick={() => setFlipped(!flipped)}
                            style={{ perspective: "1000px", transformStyle: "preserve-3d" }}
                        >
                            <div className="absolute w-full h-full flex items-center justify-center backface-hidden">
                                <div className="text-gray-800 text-base sm:text-lg">
                                    {current ? (
                                        isMCQ ? (
                                            <>
                                                <div>{current.question}</div>
                                                <ul className="mt-2 text-sm text-gray-700 list-disc list-inside">
                                                    {current.options.map((opt, idx) => (
                                                        <li key={idx}>{opt}</li>
                                                    ))}
                                                </ul>
                                            </>
                                        ) : (
                                            <div>{current.statement}</div>
                                        )
                                    ) : (
                                        <div className="text-gray-400">No questions available</div>
                                    )}
                                </div>
                            </div>
                            <div className="absolute w-full h-full flex items-center justify-center text-center backface-hidden transform rotate-y-180">
                                <div className="text-blue-600 font-semibold text-base sm:text-lg">
                                    {current ? `Answer: ${current.answer}` : ""}
                                </div>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex justify-between items-center mt-6">
                            <button
                                onClick={handleBack}
                                disabled={currentIndex === 0}
                                className="bg-gray-300 text-gray-800 px-4 py-2 rounded disabled:opacity-50"
                            >
                                ← Back
                            </button>
                            <span className="text-gray-600 text-sm">
                                {currentIndex + 1} / {allQuestions.length}
                            </span>
                            <button
                                onClick={handleNext}
                                disabled={currentIndex === allQuestions.length - 1}
                                className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
                            >
                                Next →
                            </button>
                        </div>
                        {/* Home Button */}
                        <div className="flex justify-center mt-6">
                            <button
                                onClick={() => navigate("/")}
                                className="text-sm text-blue-600 hover:underline"
                            >
                                ← Back to Dashboard
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default QuizDetail;
