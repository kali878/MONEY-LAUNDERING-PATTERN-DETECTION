import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../components/common/Header";
// API base handled by centralized api service
import Sidebar from "../components/common/Sidebar";
import Loader from "../components/common/Loader";
import {
  AlertOctagon,
  FolderUp,
  CheckCircle,
  AlertCircle,
  BrainCircuit,
} from "lucide-react";
import useFetchData from "../hooks/useFetchData";
import { useAuth } from "../hooks/useAuth";
import { createCase } from "../services/api.js";
import ErrorBanner from "../components/common/ErrorBanner.jsx";

// Enhanced RiskFactorSummary: always show all categories in consistent order (including 0 scores)
const RiskFactorSummary = ({ riskProfile, aiSummary }) => {
  if (!riskProfile) return null;

  const ORDER = ["income", "structuring", "shell", "property", "tax"];
  const LABELS = {
    income: "Income vs. Transactions",
    structuring: "Transaction Structuring",
    shell: "Shell Company Links",
    property: "High-Value Property",
    tax: "Tax Status Irregularities",
  };

  const breakdown = riskProfile.breakdown || {};

  return (
    <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 space-y-6">
      <div>
        <div className="flex items-center space-x-3 mb-4">
          <BrainCircuit className="h-7 w-7 text-orange-400" />
          <h2 className="text-xl font-bold">AI Summary & Risk Analysis</h2>
        </div>
        <div className="flex justify-between items-center mb-4 bg-gray-900/50 p-3 rounded-lg">
          <span className="font-semibold text-gray-300">
            Overall Risk Score
          </span>
          <span className="bg-red-500/20 text-red-300 text-2xl font-bold rounded-full h-14 w-14 flex items-center justify-center border-2 border-red-400">
            {riskProfile.final_risk_score}
          </span>
        </div>
        <p className="text-gray-400 text-sm whitespace-pre-line">{aiSummary}</p>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-200">
          Key Risk Indicators
        </h3>
        <ul className="space-y-2">
          {ORDER.map((key) => {
            const details = breakdown[key] || { label: LABELS[key], score: 0 };
            return (
              <li
                key={key}
                className="flex justify-between items-center bg-gray-900/50 p-2 rounded-md"
              >
                <span className="text-gray-300">
                  {details.label || LABELS[key]}
                </span>
                <span
                  className={`font-bold ${
                    details.score > 0 ? "text-orange-400" : "text-gray-500"
                  }`}
                  title={
                    details.score === 0 ? "No signals detected" : "Triggered"
                  }
                >
                  {details.score}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="text-[11px] text-gray-500 mt-3">
          Scores are rule-based (0 or 50/80/100). 0 indicates no anomaly
          detected for that category.
        </p>
      </div>
    </div>
  );
};

const Triage = () => {
  const { personId } = useParams();
  const navigate = useNavigate();
  useAuth();
  const [isEscalating, setIsEscalating] = useState(false);
  const [escalationStatus, setEscalationStatus] = useState({
    message: "",
    type: "",
  });
  const {
    data: triageData,
    loading,
    error,
  } = useFetchData(`/investigate/${personId}`);

  const handleEscalate = async () => {
    if (!triageData) return;

    setIsEscalating(true);
    setEscalationStatus({
      message: "Creating case in workspace...",
      type: "info",
    });

    try {
      const result = await createCase(triageData);

      setEscalationStatus({
        message: "Case created successfully! Redirecting...",
        type: "success",
      });
      setTimeout(() => navigate(`/workspace/${result.case_id}`), 1500);
    } catch (err) {
      setIsEscalating(false);
      setEscalationStatus({ message: err.message, type: "error" });
    }
  };

  if (loading) return <Loader />;
  if (error)
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="w-full max-w-xl px-6">
          <ErrorBanner message={`Failed to Load Triage Data: ${error.message}`} />
        </div>
      </div>
    );

  return (
    <div className="flex h-screen bg-gray-900 text-white font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-900/50 p-6 pt-24">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="bg-orange-500/20 p-2 rounded-lg">
                    <AlertOctagon className="h-8 w-8 text-orange-400" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-100">
                      Alert Triage
                    </h1>
                    <p className="text-gray-400">
                      Preliminary review for{" "}
                      <strong>
                        {triageData?.risk_profile?.person_details?.full_name}
                      </strong>{" "}
                      ({personId})
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <RiskFactorSummary
                riskProfile={triageData?.risk_profile}
                aiSummary={triageData?.ai_summary}
              />

              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                <div className="flex flex-col sm:flex-row items-center justify-between">
                  <div className="mb-4 sm:mb-0">
                    <h3 className="text-lg font-semibold">Triage Actions</h3>
                    <p className="text-gray-400 text-sm">
                      Escalate this alert to create a permanent case file.
                    </p>
                  </div>
                  <button
                    onClick={handleEscalate}
                    disabled={isEscalating}
                    className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:scale-100"
                  >
                    <FolderUp className="h-5 w-5" />
                    <span>
                      {isEscalating ? "Escalating..." : "Escalate to Workspace"}
                    </span>
                  </button>
                </div>
                {escalationStatus.message && (
                  <div
                    className={`mt-4 p-3 rounded-lg flex items-center space-x-2 text-sm ${
                      escalationStatus.type === "success"
                        ? "bg-green-500/20 text-green-300"
                        : escalationStatus.type === "error"
                        ? "bg-red-500/20 text-red-300"
                        : "bg-blue-500/20 text-blue-300"
                    }`}
                  >
                    {escalationStatus.type === "success" && (
                      <CheckCircle className="h-5 w-5" />
                    )}
                    {escalationStatus.type === "error" && (
                      <AlertCircle className="h-5 w-5" />
                    )}
                    <span>{escalationStatus.message}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Triage;
