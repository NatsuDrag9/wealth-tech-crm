import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion, Home } from 'lucide-react';
import './Misc.scss';

export function NotFound(): React.ReactElement {
  const navigate = useNavigate();

  function handleGoHome(): void {
    navigate('/');
  }

  return (
    <div className="misc-page">
      <div className="misc-page__card">
        <div className="misc-page__icon misc-page__icon--neutral">
          <FileQuestion size={48} />
        </div>
        <h1 className="misc-page__title">404 - Page Not Found</h1>
        <p className="misc-page__message">
          The page or resource you are attempting to access does not exist or has been moved.
        </p>
        <button className="app__btn app__btn--primary" onClick={handleGoHome}>
          <Home size={16} style={{ display: 'inline', marginRight: 6 }} />
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}

export default NotFound;
