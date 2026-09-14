import {
  useState,
  useMemo,
  useEffect,
  type ReactElement,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Briefcase,
  PieChart,
  Lightbulb,
} from 'lucide-react';
import { SingleSelectGenericDropdown } from '@/components/dropdowns';
import { useGetClientsQuery } from '@/services/api/clientApi';
import { useGetLatestReviewQuery } from '@/services/api/portfolioApi';
import type { DropdownType } from '@/types/genericTypes';
import { HoldingsTab } from './HoldingsTab';
import { AdvisoryTab } from './AdvisoryTab';
import './PortfolioReviews.scss';

type ActiveTab = 'holdings' | 'advisory';

export function PortfolioReviews(): ReactElement {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlClientId = searchParams.get('clientId') || '';

  const [selectedClientId, setSelectedClientId] = useState<string>(urlClientId);
  const [activeTab, setActiveTab] = useState<ActiveTab>('holdings');

  // Synchronize when URL search param changes
  useEffect(() => {
    if (urlClientId && urlClientId !== selectedClientId) {
      setSelectedClientId(urlClientId);
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

  // Fetch latest portfolio review
  const {
    data: latestReview,
    isLoading: isLoadingReview,
    refetch: refetchReview,
  } = useGetLatestReviewQuery(selectedClientId, {
    skip: !selectedClientId,
  });

  function handleClientChange(val: string | number) {
    const nextId = String(val);
    setSelectedClientId(nextId);
    if (nextId) {
      setSearchParams({ clientId: nextId });
    } else {
      setSearchParams({});
    }
  }

  function renderTabContent(): ReactElement {
    if (!selectedClientId) {
      return (
        <div className="portfolio-reviews__empty-card">
          <div className="portfolio-reviews__empty-icon">
            <Briefcase size={32} />
          </div>
          <h2 className="portfolio-reviews__empty-title">
            No Client Selected
          </h2>
          <p className="portfolio-reviews__empty-desc">
            Please choose a client from the dropdown above to review their active portfolio
            holdings, valuation history, or generate investment recommendation proposals.
          </p>
        </div>
      );
    }

    if (activeTab === 'holdings') {
      return (
        <HoldingsTab
          review={latestReview}
          isLoading={isLoadingReview}
          clientId={selectedClientId}
          onSampleCreated={() => refetchReview()}
        />
      );
    }

    return (
      <AdvisoryTab
        clientId={selectedClientId}
        latestReview={latestReview}
      />
    );
  }

  return (
    <div className="portfolio-reviews">
      <header className="portfolio-reviews__header">
        <h1 className="portfolio-reviews__title">
          Portfolio Review & Advisory
        </h1>
        <p className="portfolio-reviews__subtitle">
          Comprehensive wealth portfolio audit, performance metrics, and strategic recommendations.
        </p>
      </header>

      {/* Client Selector Bar */}
      <section className="portfolio-reviews__selector-card">
        <div className="portfolio-reviews__selector-row">
          <span className="portfolio-reviews__selector-label">
            Target Client:
          </span>
          <div className="portfolio-reviews__dropdown-wrapper">
            <SingleSelectGenericDropdown
              id="portfolio-client-selector"
              options={clientDropdownOptions}
              value={selectedClientId}
              onChange={handleClientChange}
              placeholder={isLoadingClients ? 'Loading clients...' : 'Select a client...'}
              disabled={isLoadingClients}
            />
          </div>
        </div>

        {selectedClient ? (
          <div className="portfolio-reviews__client-meta">
            <div className="portfolio-reviews__meta-item">
              <span>Client:</span>
              <strong>{selectedClient.full_name}</strong>
            </div>
            <div className="portfolio-reviews__meta-item">
              <span>PAN:</span>
              <strong>{selectedClient.pan}</strong>
            </div>
            <div className="portfolio-reviews__meta-item">
              <span>Status:</span>
              <strong>{selectedClient.status}</strong>
            </div>
            <div className="portfolio-reviews__meta-item">
              <span>KYC:</span>
              <strong>{selectedClient.kyc_status}</strong>
            </div>
          </div>
        ) : null}
      </section>

      {/* Navigation Tab Bar */}
      {selectedClientId ? (
        <div className="portfolio-reviews__tab-list" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'holdings'}
            className={`portfolio-reviews__tab-btn ${
              activeTab === 'holdings' ? 'portfolio-reviews__tab-btn--active' : ''
            }`}
            onClick={() => setActiveTab('holdings')}
          >
            <PieChart size={16} />
            <span>Portfolio Holdings & Valuation</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'advisory'}
            className={`portfolio-reviews__tab-btn ${
              activeTab === 'advisory' ? 'portfolio-reviews__tab-btn--active' : ''
            }`}
            onClick={() => setActiveTab('advisory')}
          >
            <Lightbulb size={16} />
            <span>Advisory & Recommendations</span>
          </button>
        </div>
      ) : null}

      {/* Tab Body */}
      <main className="portfolio-reviews__content">
        {renderTabContent()}
      </main>
    </div>
  );
}
