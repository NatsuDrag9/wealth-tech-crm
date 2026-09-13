import {
  useState,
  useMemo,
  useEffect,
  type ReactElement,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Compass,
  Play,
  FileCheck,
} from 'lucide-react';
import { SingleSelectGenericDropdown } from '@/components/dropdowns';
import { MainButton } from '@/components/buttons';
import { useGetClientsQuery } from '@/services/api/clientApi';
import {
  useGetLatestAssessmentQuery,
  useStartAssessmentMutation,
} from '@/services/api/riskAppetiteApi';
import type { DropdownType } from '@/types/genericTypes';
import type { StartAssessmentResponse } from '@/definitions/riskAppetiteTypes';
import { AssessmentWizard } from './AssessmentWizard';
import { AssessmentResultsCard } from './AssessmentResultsCard';
import './RiskAppetite.scss';

export function RiskAppetite(): ReactElement {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlClientId = searchParams.get('clientId') || '';

  const [selectedClientId, setSelectedClientId] = useState<string>(urlClientId);
  const [activeAssessment, setActiveAssessment] = useState<StartAssessmentResponse | null>(null);

  // Synchronize when URL search param changes
  useEffect(() => {
    if (urlClientId && urlClientId !== selectedClientId) {
      setSelectedClientId(urlClientId);
      setActiveAssessment(null);
    }
  }, [urlClientId, selectedClientId]);

  // Load clients for selector
  const { data: clientsData, isLoading: isLoadingClients } = useGetClientsQuery({
    pageSize: 100,
  });

  const clients = useMemo(() => clientsData?.results ?? [], [clientsData]);

  const clientDropdownOptions = useMemo<DropdownType[]>(
    () => clients.map((c) => ({
      displayName: `${c.full_name} (${c.pan})`,
      value: String(c.id),
    })),
    [clients],
  );

  const selectedClient = useMemo(
    () => clients.find((c) => String(c.id) === selectedClientId),
    [clients, selectedClientId],
  );

  // Fetch latest completed assessment for selected client
  const {
    data: latestAssessment,
    isLoading: isLoadingLatest,
    isError: isLatestError,
    refetch: refetchLatest,
  } = useGetLatestAssessmentQuery(selectedClientId, {
    skip: !selectedClientId || Boolean(activeAssessment),
  });

  const [startAssessment, { isLoading: isStarting }] = useStartAssessmentMutation();

  function handleClientChange(val: string | number) {
    const nextId = String(val);
    setSelectedClientId(nextId);
    setActiveAssessment(null);
    if (nextId) {
      setSearchParams({ clientId: nextId });
    } else {
      setSearchParams({});
    }
  }

  async function handleStartOrResumeAssessment() {
    if (!selectedClientId) return;

    try {
      const response = await startAssessment({
        clientId: selectedClientId,
      }).unwrap();
      setActiveAssessment(response);
    } catch {
      // Error handled by mutation state
    }
  }

  function handleAssessmentCompleted() {
    setActiveAssessment(null);
    refetchLatest();
  }

  const hasCompletedAssessment = Boolean(
    latestAssessment && latestAssessment.status === 'COMPLETED' && !isLatestError,
  );

  function renderContent(): ReactElement {
    if (!selectedClientId) {
      return (
        <div className="risk-appetite__empty-card">
          <div className="risk-appetite__empty-icon">
            <Compass size={32} />
          </div>
          <h2 className="risk-appetite__empty-title">
            No Client Selected
          </h2>
          <p className="risk-appetite__empty-desc">
            Please choose a wealth client from the selector above to review their
            regulatory risk profile or launch a new psychometric suitability assessment.
          </p>
        </div>
      );
    }

    if (activeAssessment) {
      return (
        <AssessmentWizard
          raId={activeAssessment.id}
          initialAnswers={activeAssessment.answers}
          onComplete={handleAssessmentCompleted}
          onCancel={() => setActiveAssessment(null)}
        />
      );
    }

    if (isLoadingLatest) {
      return (
        <div className="risk-appetite__empty-card">
          <p className="risk-appetite__empty-desc">
            Loading client risk profile...
          </p>
        </div>
      );
    }

    if (hasCompletedAssessment && latestAssessment) {
      return (
        <AssessmentResultsCard
          result={latestAssessment}
          clientName={selectedClient?.full_name}
          onRetake={handleStartOrResumeAssessment}
          isRetaking={isStarting}
        />
      );
    }

    return (
      <div className="risk-appetite__start-card">
        <div className="risk-appetite__start-icon">
          <FileCheck size={28} />
        </div>
        <h2 className="risk-appetite__start-title">
          No Completed Assessment on Record
        </h2>
        <p className="risk-appetite__start-desc">
          {selectedClient?.full_name}
          {' '}
          does not have an active certified risk assessment.
          SEBI regulations require completing this questionnaire before portfolio review.
        </p>

        <MainButton
          label="Start Risk Assessment"
          variant="primary"
          size="md"
          icon={<Play size={16} />}
          iconPosition="left"
          onClick={handleStartOrResumeAssessment}
          isLoading={isStarting}
        />
      </div>
    );
  }

  return (
    <div className="risk-appetite">
      <header className="risk-appetite__header">
        <h1 className="risk-appetite__title">
          Investor Risk Tolerance & Suitability
        </h1>
        <p className="risk-appetite__subtitle">
          SEBI-mandated suitability evaluation, psychometric risk classification,
          and asset allocation.
        </p>
      </header>

      {/* Client Selector Bar */}
      <section className="risk-appetite__selector-card">
        <div className="risk-appetite__selector-row">
          <span className="risk-appetite__selector-label">
            Target Client:
          </span>
          <div className="risk-appetite__dropdown-wrapper">
            <SingleSelectGenericDropdown
              id="risk-client-selector"
              options={clientDropdownOptions}
              value={selectedClientId}
              onChange={handleClientChange}
              placeholder={isLoadingClients ? 'Loading clients...' : 'Select a client...'}
              disabled={isLoadingClients || Boolean(activeAssessment)}
            />
          </div>
        </div>

        {selectedClient ? (
          <div className="risk-appetite__client-meta">
            <div className="risk-appetite__meta-item">
              <span>Client Name:</span>
              <strong>{selectedClient.full_name}</strong>
            </div>
            <div className="risk-appetite__meta-item">
              <span>PAN:</span>
              <strong>{selectedClient.pan}</strong>
            </div>
            <div className="risk-appetite__meta-item">
              <span>Status:</span>
              <strong>{selectedClient.status}</strong>
            </div>
            <div className="risk-appetite__meta-item">
              <span>KYC:</span>
              <strong>{selectedClient.kyc_status}</strong>
            </div>
          </div>
        ) : null}
      </section>

      {/* Body / State Rendering */}
      <main className="risk-appetite__content">
        {renderContent()}
      </main>
    </div>
  );
}
