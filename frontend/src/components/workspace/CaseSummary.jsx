import React from 'react';
import { FileText, User, Shield, Calendar } from 'lucide-react';

// Mock data that would come from the /api/investigate/<case_id> endpoint
const mockCaseData = {
  caseId: 'CASE-2025-08-31-001',
  personName: 'Arjun Verma',
  status: 'Open',
  dateCreated: '2025-08-31T12:34:56Z',
  riskScore: 92,
  aiSummary: "Arjun Verma, a subject with a declared monthly income of ₹50,000, has been flagged for high-risk financial activities. The primary anomaly is a real estate purchase valued at ₹95,00,000, a figure grossly inconsistent with his known income. This transaction was preceded by a series of structured cash deposits from multiple unidentified sources. Furthermore, Verma's accounts show significant fund transfers to 'Zenith Global Exports,' a recently incorporated entity with characteristics of a shell company. The rapid movement of these funds post-deposit suggests a layering scheme intended to obscure the origin of the capital. The confluence of these factors points towards a sophisticated money laundering operation."
};


const CaseSummary = ({ caseData = mockCaseData }) => {
  return (
    <div className="w-full bg-gray-900/70 backdrop-blur-xl border border-cyan-500/20 rounded-lg shadow-2xl shadow-cyan-900/30 p-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start mb-6 pb-6 border-b border-gray-700/50">
        <div>
          <h2 className="text-3xl font-bold text-cyan-300 tracking-wider">Case Dossier</h2>
          <p className="text-gray-400">{caseData.caseId}</p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-4 text-sm">
            <span className="flex items-center bg-green-500/20 text-green-300 px-3 py-1 rounded-full">
                <Shield size={16} className="mr-2"/>
                {caseData.status}
            </span>
             <span className="flex items-center text-gray-400">
                <Calendar size={16} className="mr-2"/>
                {new Date(caseData.dateCreated).toLocaleDateString()}
            </span>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-200 mb-2 flex items-center">
            <User className="mr-3 text-cyan-400"/>
            Person of Interest
        </h3>
        <p className="text-2xl text-white font-medium">{caseData.personName}</p>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-gray-200 mb-3 flex items-center">
            <FileText className="mr-3 text-cyan-400"/>
            AI-Generated Summary
        </h3>
        <div className="p-4 bg-black/30 rounded-lg border border-gray-700">
            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{caseData.aiSummary}</p>
        </div>
      </div>
    </div>
  );
};

export default CaseSummary;

