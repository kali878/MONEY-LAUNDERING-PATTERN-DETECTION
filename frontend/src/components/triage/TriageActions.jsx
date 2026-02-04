import { ShieldCheck, XCircle } from 'lucide-react';
import Button from '../common/Button';

const TriageActions = () => {

  const handleEscalate = () => {
    // In a real app, this would trigger a POST request to '/api/cases/escalate'
    // and then navigate the user to the investigation workspace.
    // e.g., navigate(`/workspace/${caseId}`);
  };

  const handleDismiss = () => {
    // This would trigger a POST request to '/api/alerts/dismiss'
    // and likely show a modal asking for a reason.
  };

  return (
    <div className="w-full bg-gray-900/70 backdrop-blur-xl border border-cyan-500/20 rounded-lg shadow-2xl shadow-cyan-900/30 p-6 animate-fadeIn mt-6">
      <div className="flex flex-col md:flex-row items-center justify-between">
        <div className="mb-4 md:mb-0 text-center md:text-left">
          <h3 className="text-xl font-bold text-gray-200">Investigator Action Required</h3>
          <p className="text-gray-400">Review the findings and proceed with the appropriate action.</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button 
            onClick={handleDismiss} 
            variant="secondary"
            icon={XCircle}
          >
            Dismiss Alert
          </Button>
          <Button 
            onClick={handleEscalate} 
            variant="primary"
            icon={ShieldCheck}
          >
            Escalate to Case
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TriageActions;

