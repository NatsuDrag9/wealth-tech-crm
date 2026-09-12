import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import './Misc.scss';

export function Unauthorized(): React.ReactElement {
  const navigate = useNavigate();

  function handleGoBack(): void {
    navigate(-1);
  }

  return (
    <div className="misc-page">
      <div className="misc-page__card">
        <div className="misc-page__icon misc-page__icon--warning">
          <ShieldAlert size={48} />
        </div>
        <h1 className="misc-page__title">Access Restricted</h1>
        <p className="misc-page__message">
          You do not have the required role or permissions to view this resource. Contact your
          organization administrator if you believe this is an error.
        </p>
        <button className="app__btn app__btn--primary" onClick={handleGoBack}>
          <ArrowLeft size={16} style={{ display: 'inline', marginRight: 6 }} />
          Go Back
        </button>
      </div>
    </div>
  );
}

export default Unauthorized;
