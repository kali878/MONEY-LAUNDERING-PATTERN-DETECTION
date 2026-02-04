import React from 'react';
import { AlertTriangle, DollarSign, Building, Zap, CheckCircle } from 'lucide-react';

// Mock data that would come from the backend API for a specific person
const mockRiskData = {
  total_score: 92,
  breakdown: [
    {
      id: 1,
      name: 'Income Discrepancy',
      score: 45,
      description: 'A transaction of ₹1,80,000 was detected, which is 3.6x the declared monthly income.',
      severity: 'critical'
    },
    {
      id: 2,
      name: 'Shell Company Interaction',
      score: 30,
      description: 'Linked to "Zenith Global Exports", a company incorporated 2 months ago with low capital.',
      severity: 'high'
    },
    {
      id: 3,
      name: 'Rapid Movement of Funds',
      score: 17,
      description: 'Funds were transferred out of the account within 3 hours of deposit.',
      severity: 'medium'
    }
  ]
};

const iconMap = {
  'Income Discrepancy': <DollarSign className="h-6 w-6" />,
  'Shell Company Interaction': <Building className="h-6 w-6" />,
  'Rapid Movement of Funds': <Zap className="h-6 w-6" />,
  'Structuring': <CheckCircle className="h-6 w-6" />,
  'Default': <AlertTriangle className="h-6 w-6" />
};

const severityStyles = {
    critical: { text: 'text-red-400', border: 'border-red-500/50', bg: 'bg-red-500' },
    high: { text: 'text-orange-400', border: 'border-orange-500/50', bg: 'bg-orange-500' },
    medium: { text: 'text-yellow-400', border: 'border-yellow-500/50', bg: 'bg-yellow-500' },
};


const RiskFactorSummary = ({ riskData = mockRiskData }) => {
  return (
    <div className="w-full bg-gray-900/70 backdrop-blur-xl border border-cyan-500/20 rounded-lg shadow-2xl shadow-cyan-900/30 p-6 animate-fadeIn">
      <h2 className="text-2xl font-bold text-cyan-300 mb-2">Key Risk Factors</h2>
      <p className="text-gray-400 mb-6">Automated analysis of contributing factors to the total risk score.</p>

      <div className="space-y-4">
        {riskData.breakdown.map((factor) => {
          const styles = severityStyles[factor.severity] || {};
          const Icon = iconMap[factor.name] || iconMap['Default'];

          return (
            <div key={factor.id} className={`p-4 rounded-lg border ${styles.border} bg-gray-800/50 flex items-start space-x-4`}>
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${styles.text} bg-gray-900/50 border-2 ${styles.border}`}>
                    {Icon}
                </div>
                <div className="flex-grow">
                    <div className="flex justify-between items-center">
                        <h4 className="text-lg font-semibold text-gray-200">{factor.name}</h4>
                        <span className={`text-xl font-bold ${styles.text}`}>+{factor.score} pts</span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">{factor.description}</p>
                    <div className="w-full bg-gray-700 rounded-full h-2.5 mt-3">
                      <div className={`${styles.bg}`} style={{ width: `${factor.score / riskData.total_score * 100}%` }}></div>
                    </div>
                </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RiskFactorSummary;
