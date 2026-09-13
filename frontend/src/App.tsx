import {
  Users, PieChart, ShieldAlert, Layers, CheckCircle2,
} from 'lucide-react';
import { useAppSelector } from '@/store';
import { showSuccessToast, showInfoToast } from '@/utils/toastUtils';
import './App.scss';

export function App() {
  const auth = useAppSelector((state) => state.auth);

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <Layers size={22} />
          <span>WealthTech CRM</span>
        </div>
        <div className="app__status-badge">
          <CheckCircle2 size={14} />
          <span>Frontend Active</span>
        </div>
      </header>

      <main className="app__main">
        <div className="app__welcome-card">
          <h1 className="app__title">WealthTech Enterprise CRM</h1>
          <p className="app__description">
            Client Presentation Layer built with React 19, TypeScript, Vite, and Redux Toolkit.
            Configured with SCSS/BEM styling and an in-memory session model designed to consume both
            Spring Boot and Node.js backend implementations.
          </p>
          <div className="app__actions">
            <button
              type="button"
              className="app__btn app__btn--primary"
              onClick={() => showSuccessToast('Toast notification system is active!')}
            >
              Test Success Toast
            </button>
            <button
              type="button"
              className="app__btn app__btn--secondary"
              onClick={() => showInfoToast(
                `Redux Auth Status: ${auth.isAuthenticated ? 'Authenticated' : 'Guest (Unauthenticated)'}`,
              )}
            >
              Check Auth State
            </button>
          </div>
        </div>

        <div className="app__grid">
          <div className="app__card">
            <h3 className="app__card-title">
              <Users size={20} color="#1e3a8a" />
              Client Lifecycle & KYC
            </h3>
            <p className="app__card-text">
              Onboarding state machine, KYC verification, Excel bulk upload ingestion, and automatic
              Relationship Manager assignment.
            </p>
          </div>

          <div className="app__card">
            <h3 className="app__card-title">
              <ShieldAlert size={20} color="#0d9488" />
              Risk Appetite Assessment
            </h3>
            <p className="app__card-text">
              14-question single-page assessment with real-time answer persistence and server-side
              risk category scoring.
            </p>
          </div>

          <div className="app__card">
            <h3 className="app__card-title">
              <PieChart size={20} color="#d97706" />
              Portfolio Review & PDF
            </h3>
            <p className="app__card-text">
              Holdings review, SELL fund replacement, proposal creation, and asynchronous 2.5s
              polling for generated PDF reports.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
