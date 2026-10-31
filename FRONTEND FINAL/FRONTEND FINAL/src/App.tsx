import { BrowserRouter, Route, Routes } from "react-router-dom"
import { AssessmentPage } from "./pages/AssessmentPage"
import { AssessmentsPage } from "./pages/AssessmentsPage"
import { AuthPage } from "./pages/AuthPage"
import { CompletionPage } from "./pages/CompletionPage"
import { DashboardPage } from "./pages/DashboardPage"
import { HomePage } from "./pages/HomePage"
import { LandingPage } from "./pages/LandingPage"
import { ResultsPage } from "./pages/ResultsPage"
import { SimplePage } from "./pages/SimplePage"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/signup" element={<AuthPage mode="signup" />} />
        <Route path="/register" element={<AuthPage mode="signup" />} />
        <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/assessments" element={<AssessmentsPage />} />
        <Route path="/assessment/:slug" element={<AssessmentPage />} />
        <Route path="/complete" element={<CompletionPage />} />
        <Route path="/results" element={<ResultsPage />} />
        {["learning", "practice", "progress", "profile"].map((type) => (
          <Route
            key={type}
            path={`/${type}`}
            element={<SimplePage type={type} />}
          />
        ))}
        <Route path="/assessor" element={<SimplePage type="dashboard" />} />
        <Route
          path="/assessor/students"
          element={<SimplePage type="students" />}
        />
        <Route path="/assessor/review" element={<SimplePage type="review" />} />
        <Route path="/assessor/report" element={<SimplePage type="report" />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  )
}
