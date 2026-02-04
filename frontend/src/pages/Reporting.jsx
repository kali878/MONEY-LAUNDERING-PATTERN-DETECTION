import { useState, useEffect } from 'react';
import Header from '../components/common/Header';
import Sidebar from '../components/common/Sidebar';
import { FileDown, BookCheck, Loader2 } from 'lucide-react';
import useFetchData from '../hooks/useFetchData';
import { useAuth } from '../hooks/useAuth';
import { generatePdfReport } from '../services/api.js';
import ErrorBanner from '../components/common/ErrorBanner.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import LoadingOverlay from '../components/common/LoadingOverlay.jsx';

const Reporting = () => {
    // --- THIS IS THE FIX: The URL no longer includes the '/api' prefix ---
    const { data: cases, loading: isLoading, error } = useFetchData('/cases');
    const [loadingStates, setLoadingStates] = useState({});
    const [successMsg, setSuccessMsg] = useState('');
    useAuth(); // Initialize auth for token provider

    // --- A functional report generation handler ---
        const handleGenerateReport = async (caseId, subjectName) => {
        setLoadingStates(prev => ({ ...prev, [caseId]: true }));
        
        try {
            const blob = await generatePdfReport(caseId);
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = downloadUrl;
            const fileName = `Investigation_Report_${subjectName.replace(/\s+/g, '_')}_${caseId}.pdf`;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);
            setSuccessMsg(`Report downloaded for ${subjectName} (${caseId}).`);

        } catch (err) {
            if (import.meta.env?.DEV) console.error('Report generation failed:', err);
            alert(`Failed to generate report: ${err.message}`);
        } finally {
            setLoadingStates(prev => ({ ...prev, [caseId]: false }));
        }
    };

    useEffect(() => {
        if (!successMsg) return;
        const t = setTimeout(() => setSuccessMsg(''), 2500);
        return () => clearTimeout(t);
    }, [successMsg]);

    return (
        <div className="flex h-screen bg-gray-900 text-white font-sans">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-900/50 p-6 pt-24">
                    <div className="max-w-7xl mx-auto">
                        <div className="mb-6 flex items-center space-x-3 animate-fadeIn">
                            <div className="bg-green-500/20 p-2 rounded-lg">
                                <BookCheck className="h-8 w-8 text-green-400" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-100">Reporting Center</h1>
                                <p className="text-gray-400">Generate and download final investigation reports for escalated cases.</p>
                            </div>
                        </div>
                        
                                                <div className="relative w-full bg-gray-900/60 backdrop-blur-md border border-cyan-500/20 rounded-lg shadow-lg overflow-hidden animate-fadeInUp">
                                                        {successMsg && (
                                                            <div className="p-4">
                                                                <ErrorBanner message={successMsg} variant="success" />
                                                            </div>
                                                        )}
                                                        {isLoading ? (
                                                                <div className="h-64">
                                                                    <LoadingOverlay overlay message="Loading Completed Cases..." />
                                                                </div>
                                                        ) : error ? (
                                <div className="p-6"><ErrorBanner message={`Failed to load cases: ${error.message}`} /></div>
                            ) : (
                                <table className="w-full text-left">
                                    <thead className="bg-gray-800/50">
                                        <tr>
                                            <th className="p-4 text-sm font-semibold text-gray-300 tracking-wider">Case ID</th>
                                            <th className="p-4 text-sm font-semibold text-gray-300 tracking-wider">Subject</th>
                                            <th className="p-4 text-sm font-semibold text-gray-300 tracking-wider">Final Risk Score</th>
                                            <th className="p-4 text-sm font-semibold text-gray-300 tracking-wider">Date Escalated</th>
                                            <th className="p-4 text-sm font-semibold text-gray-300 tracking-wider">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700/50">
                                        {(!cases || cases.length === 0) && (
                                            <tr>
                                                <td colSpan="5" className="p-6"><EmptyState title="No completed cases" subtitle="Once cases are escalated and completed, they will appear here." /></td>
                                            </tr>
                                        )}
                                        {cases && cases.map((caseItem) => (
                                            <tr key={caseItem.caseId} className="hover:bg-gray-800/40 transition-colors">
                                                <td className="p-4 text-cyan-400 font-mono text-sm">{caseItem.caseId}</td>
                                                <td className="p-4 text-gray-200">{caseItem.subject}</td>
                                                <td className="p-4 font-semibold text-orange-400">{caseItem.riskScore}</td>
                                                <td className="p-4 text-gray-400">{caseItem.conclusionDate}</td>
                                                <td className="p-4">
                                                    <button
                                                        onClick={() => handleGenerateReport(caseItem.caseId, caseItem.subject)}
                                                        className="flex items-center space-x-2 bg-cyan-600/50 hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold text-xs py-2 px-3 rounded-lg transition"
                                                        disabled={loadingStates[caseItem.caseId]}
                                                    >
                                                        {loadingStates[caseItem.caseId] ? 
                                                            <Loader2 className="h-4 w-4 animate-spin"/> : 
                                                            <FileDown className="h-4 w-4" />
                                                        }
                                                        <span>{loadingStates[caseItem.caseId] ? 'Generating...' : 'Generate Report'}</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Reporting;

