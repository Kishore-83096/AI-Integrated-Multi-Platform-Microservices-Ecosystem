import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/auth_context";
import Login from "./pages/login";
import Registration from "./pages/registration";
import Dashboard from "./pages/dashboard";
import AiChat from "./pages/aichat";
import PrivateRoute from "./components/privateroutes";


function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Registration />} />

          {/* Protected*/}
          <Route path="/dashboard"element={<PrivateRoute><Dashboard /></PrivateRoute>}/>
          <Route path="/aichat" element={ <PrivateRoute><AiChat /></PrivateRoute>}/>
            
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
