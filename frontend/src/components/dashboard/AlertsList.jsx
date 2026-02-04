import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import Loader from "../common/Loader";
import LoadingOverlay from "../common/LoadingOverlay";
import ErrorBanner from "../common/ErrorBanner";
import EmptyState from "../common/EmptyState";
import { User, ArrowRight } from "lucide-react";
import { useAuth } from "../../hooks/useAuth.jsx";
import { getAlerts } from "../../services/api.js";

const AlertsList = ({ refetchTrigger }) => {
  const { user } = useAuth();
  const [alerts, setAlerts] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const [justRefreshed, setJustRefreshed] = React.useState(false);

  const fetchAlerts = React.useCallback(async (isRefetch = false) => {
    try {
      if (isRefetch) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const data = await getAlerts({ limit: 30 });
      setAlerts(data);
    } catch (e) {
      setError(e);
    } finally {
      if (isRefetch) {
        setRefreshing(false);
        setJustRefreshed(true);
        setTimeout(() => setJustRefreshed(false), 1800);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (user) fetchAlerts();
  }, [user, fetchAlerts]);

  // --- IMPORTANT: This effect listens for changes to the trigger ---
  // When the parent component changes 'refetchTrigger', this will run.
  useEffect(() => {
    // Don't refetch on the initial render (when trigger is 0)
  if (refetchTrigger > 0) fetchAlerts(true);
  }, [refetchTrigger, fetchAlerts]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader />
      </div>
    );
  }

  if (error) return <ErrorBanner message={`Failed to load alerts. ${error.message}`} />;

  if (!alerts || alerts.length === 0) {
    return <EmptyState title="No high-priority alerts" subtitle="Run analysis to generate new alerts." />;
  }

  return (
    <div className="relative">
      {refreshing && (
        <LoadingOverlay overlay message="Refreshing alerts..." />
      )}
      {justRefreshed && (
        <div className="mb-3"><ErrorBanner message="Alerts refreshed." variant="success" /></div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
      {alerts.map((alert) => (
        <div
          key={alert.person_id}
          className="bg-gray-800/60 p-5 rounded-xl border border-gray-700 flex flex-col justify-between hover:border-cyan-500 transition-all duration-300 transform hover:-translate-y-1"
        >
          <div>
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center space-x-3">
                <User className="h-6 w-6 text-cyan-400" />
                <h3 className="text-xl font-bold text-white">
                  {alert.full_name}
                </h3>
              </div>
              <span className="bg-red-500/20 text-red-300 text-lg font-bold rounded-full h-12 w-12 flex items-center justify-center border-2 border-red-400">
                {alert.final_risk_score}
              </span>
            </div>
            <p className="text-gray-400 mb-4 h-16">{alert.summary}</p>
          </div>
          <Link
            to={`/triage/${alert.person_id}`}
            className="group mt-auto flex items-center justify-center w-full bg-cyan-600/50 hover:bg-cyan-600 text-white font-semibold py-2 px-4 rounded-lg transition-all"
          >
            Triage Case
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      ))}
      </div>
    </div>
  );
};

export default AlertsList;
