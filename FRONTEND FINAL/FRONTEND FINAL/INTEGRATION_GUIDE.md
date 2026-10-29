# Frontend Integration Guide

## 🔗 Connect Frontend to Backend

### 1. Create `.env` file in frontend

```bash
cd "FRONTEND FINAL"
cp .env.example .env
```

Edit `.env`:
```
VITE_API_URL=http://localhost:5000/api
```

### 2. Install API Service (Already Created)

The API service is in: `src/services/api.ts`

### 3. Update Your Components

#### Example: Login Component

```typescript
// src/pages/AuthPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

export function AuthPage({ mode }: { mode: "login" | "signup" | "forgot" }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      if (mode === 'login') {
        await authAPI.login(email, password);
      } else if (mode === 'signup') {
        const name = formData.get('name') as string;
        await authAPI.signup({ email, password, name });
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    // Your existing JSX with form onSubmit={handleSubmit}
    // Add name attributes to inputs: name="email", name="password", name="name"
  );
}
```

#### Example: Assessment Component

```typescript
// src/pages/AssessmentPage.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { assessmentAPI, responseAPI } from '../services/api';

export function AssessmentPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    loadTest();
    startSession();
  }, [slug]);

  const loadTest = async () => {
    try {
      const testData = await assessmentAPI.getTestBySlug(slug!);
      setTest(testData);
    } catch (error) {
      console.error('Failed to load test:', error);
    }
  };

  const startSession = async () => {
    try {
      const session = await assessmentAPI.startSession();
      setSessionId(session.id);
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  const handleChoiceSubmit = async (selectedOption: string) => {
    try {
      const result = await responseAPI.submitChoice({
        sessionId,
        testId: test.id,
        selectedOption
      });

      if (result.isCorrect) {
        // Show success, move to next test
        navigate('/assessment/next-test');
      }
    } catch (error) {
      console.error('Failed to submit response:', error);
    }
  };

  const handleAudioSubmit = async (audioBlob: Blob) => {
    try {
      const result = await responseAPI.submitAudio(
        sessionId,
        test.id,
        audioBlob,
        test.stimulus
      );

      console.log('Assessment:', result.assessment);
      
      if (result.assessment.isCorrect) {
        // Move to next test
      }
    } catch (error) {
      console.error('Failed to submit audio:', error);
    }
  };

  // Your existing JSX
}
```

#### Example: Dashboard with Real Data

```typescript
// src/pages/DashboardPage.tsx
import { useEffect, useState } from 'react';
import { dashboardAPI } from '../services/api';

export function DashboardPage() {
  const [progress, setProgress] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [progressData, summaryData] = await Promise.all([
        dashboardAPI.getProgress(),
        dashboardAPI.getSummary()
      ]);
      setProgress(progressData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    }
  };

  return (
    <AppShell>
      <div className="page dashboard">
        <section className="welcome">
          <div>
            <h1>Welcome back, {summary?.userName}</h1>
            <p>You're making steady progress.</p>
          </div>
        </section>

        <div className="dashboard-grid">
          <section className="panel progress-panel">
            <h2>{progress?.completedTests} of {progress?.totalTests} activities complete</h2>
            <span className="big-percent">{progress?.percentage}%</span>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
```

#### Example: Results Page

```typescript
// src/pages/ResultsPage.tsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { resultsAPI } from '../services/api';

export function ResultsPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (sessionId) {
      loadResults();
    }
  }, [sessionId]);

  const loadResults = async () => {
    try {
      const resultData = await resultsAPI.getResultBySession(sessionId!);
      setResult(resultData);
    } catch (error) {
      console.error('Failed to load results:', error);
    }
  };

  if (!result) return <div>Loading...</div>;

  return (
    <div className="results-page">
      <h1>Assessment Results</h1>
      
      <div className="risk-level">
        <h2>Dyslexia Risk Level: {result.dyslexiaRiskLevel}</h2>
        <p>Risk Percentage: {result.dyslexiaRiskPercent.toFixed(1)}%</p>
      </div>

      <div className="category-scores">
        <h3>Category Scores</h3>
        <ul>
          <li>Phonological: {result.phonologicalScore.toFixed(1)}</li>
          <li>Word Reading: {result.wordReadingScore.toFixed(1)}</li>
          <li>Rapid Naming: {result.rapidNamingScore.toFixed(1)}</li>
        </ul>
      </div>

      <div className="recommendations">
        <h3>Recommendations</h3>
        <ul>
          {result.recommendations.map((rec: string, i: number) => (
            <li key={i}>{rec}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

### 4. Protected Routes

Create an auth guard:

```typescript
// src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { getToken } from '../services/api';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = getToken();
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
```

Update App.tsx:

```typescript
import { ProtectedRoute } from './components/ProtectedRoute';

<Route path="/dashboard" element={
  <ProtectedRoute>
    <DashboardPage />
  </ProtectedRoute>
} />
```

---

## 🚀 Complete Startup Sequence

### Terminal 1 - Backend
```bash
cd BACKEND
npm install
npm run prisma:generate
npm run prisma:migrate
npx ts-node prisma/seed.ts
npm run dev
```

### Terminal 2 - Frontend
```bash
cd "FRONTEND FINAL"
npm install
npm run dev
```

Now visit: `http://localhost:8443`

---

## ✅ Testing the Full Stack

1. **Sign up**: Create account at `/signup`
2. **Login**: Login at `/login`
3. **Dashboard**: See progress at `/dashboard`
4. **Start Assessment**: Click "Continue assessment"
5. **Complete Tests**: 
   - Choice questions → Select answer
   - Audio tasks → Record and submit
6. **View Results**: After 10 tests, see risk calculation

---

## 🎤 Audio Recording Integration

Your existing `useRecorder` hook works! Just connect it to the API:

```typescript
// In your assessment component
import { useRecorder } from '../hooks/useRecorder';
import { responseAPI } from '../services/api';

const { startRecording, stopRecording, audioBlob } = useRecorder();

useEffect(() => {
  if (audioBlob) {
    submitAudio();
  }
}, [audioBlob]);

const submitAudio = async () => {
  try {
    const result = await responseAPI.submitAudio(
      sessionId,
      currentTest.id,
      audioBlob!,
      currentTest.stimulus
    );
    
    // Show result to user
    console.log('Pronunciation Score:', result.assessment.pronunciationScore);
    console.log('Is Correct:', result.assessment.isCorrect);
  } catch (error) {
    console.error(error);
  }
};
```

---

## 🔧 API Error Handling

The API service automatically handles:
- JWT token management
- Request formatting
- Error responses
- Authorization headers

Always wrap API calls in try-catch:

```typescript
try {
  const result = await authAPI.login(email, password);
  // Success
} catch (error: any) {
  setError(error.message); // Display to user
}
```

---

**Your full-stack Dhwani app is now ready! 🎉**
