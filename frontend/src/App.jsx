import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
// import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
// import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
// import QuizDetail from "./pages/QuizDetail";
// import UploadQuiz from "./pages/UploadQuiz";

function App() {
    return (
        <Router>
            <AuthProvider>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    {/* <Route path="/register" element={<Register />} /> */}

                    <Route path="/" element={
                        // <ProtectedRoute>
                        <Dashboard />
                        // </ProtectedRoute>
                    } />

                    {/* <Route path="/quiz/:id" element={
                        <ProtectedRoute>
                            <QuizDetail />
                        </ProtectedRoute>
                    } />

                    <Route path="/upload" element={
                        <ProtectedRoute>
                            <UploadQuiz />
                        </ProtectedRoute>
                    } /> */}
                </Routes>
            </AuthProvider>
        </Router>
    );
}

export default App;