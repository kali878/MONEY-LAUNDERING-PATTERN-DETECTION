import { useState, useEffect, useCallback } from 'react';
import Header from '../components/common/Header.jsx';
import Sidebar from '../components/common/Sidebar.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { getProfile, updateProfile, getApiKeyMasked, updateApiKey, regenerateDataset, clearAllCases, getDatasetMetadata, uploadDataset } from '../services/api.js';
import LoadingOverlay from '../components/common/LoadingOverlay.jsx';
import { Settings, User, Key, Database, Save, RefreshCw, Trash2 } from 'lucide-react';

// A reusable card component for different settings sections
const SettingsCard = ({ title, icon: Icon, children }) => (
    <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 hover:border-gray-600 transition-all duration-300">
        <div className="flex items-center space-x-3 mb-4">
            <div className="bg-purple-500/20 p-2 rounded-lg">
                <Icon className="h-6 w-6 text-purple-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-100">{title}</h2>
        </div>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

// A reusable input field component
const InputField = ({ label, id, type = 'text', value, onChange, placeholder, disabled = false }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
        <input
            type={type}
            id={id}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full bg-gray-900/70 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
        />
    </div>
);

// Custom Button component
const Button = ({ children, onClick, variant = 'primary', disabled = false, isLoading = false, icon: Icon, className = '' }) => {
    const baseClasses = "flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
    
    const variantClasses = {
        primary: "bg-purple-600 hover:bg-purple-700 text-white",
        secondary: "bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400",
        danger: "bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400",
        success: "bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400"
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled || isLoading}
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        >
            {isLoading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
                Icon && <Icon className="h-4 w-4" />
            )}
            <span>{children}</span>
        </button>
    );
};

const SettingsPage = () => {
    // ...existing code...
    const { user } = useAuth();
    // Ensure a mock token exists in localStorage for mock auth environments (non-destructive)
    useEffect(() => {
        try {
            const existing = localStorage.getItem('authToken');
            if (!existing) {
                localStorage.setItem('authToken', 'mock-jwt-token-12345');
            }
    } catch { /* ignore storage errors */ }
    }, []);

    // --- State Management for Settings ---
    const [profile, setProfile] = useState({ displayName: '', email: '', department: '', badge: '' });
    const [apiKey, setApiKey] = useState('');
    const [apiKeyMasked, setApiKeyMasked] = useState('');
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const [feedback, setFeedback] = useState({ message: '', type: '' });
    const [loadingSettings, setLoadingSettings] = useState(true);
    const [meta, setMeta] = useState(null);
    const [uploadBusy, setUploadBusy] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [datasetKey, setDatasetKey] = useState('persons');

    

    // Handlers for updating state
    const handleProfileChange = (e) => {
        setProfile({ ...profile, [e.target.id]: e.target.value });
    };

    const showFeedback = (message, type) => {
        setFeedback({ message, type });
        setTimeout(() => setFeedback({ message: '', type: '' }), 5000);
    };

    const fetchSettings = useCallback(async () => {
        setLoadingSettings(true);
        try {
        const pData = await getProfile();
        if (pData) setProfile(prev => ({ ...prev, ...pData }));
        const kData = await getApiKeyMasked();
        if (kData && typeof kData.apiKeyMasked === 'string') setApiKeyMasked(kData.apiKeyMasked);
        // Fetch dataset metadata for About section
        try {
            const m = await getDatasetMetadata();
            setMeta(m || null);
        } catch (e) {
            if (import.meta.env?.DEV) console.warn('Failed to load metadata', e);
        }
        } catch (e) {
            if (import.meta.env?.DEV) console.warn('Failed to load settings', e);
        } finally {
            setLoadingSettings(false);
        }
    }, []);

    useEffect(() => { fetchSettings(); }, [user, fetchSettings]);

    const handleSaveProfile = async () => {
        try {
            await updateProfile(profile);
            showFeedback('Profile updated successfully!', 'success');
        } catch {
            showFeedback('Failed to update profile.', 'error');
        }
    };

    const handleSaveApiKey = async () => {
        try {
            await updateApiKey(apiKey);
            showFeedback('API Key updated successfully!', 'success');
            fetchSettings();
            setApiKey('');
        } catch {
            showFeedback('Failed to update API Key.', 'error');
        }
    };

    const handleRegenerate = async () => {
        if (!window.confirm("Are you sure you want to regenerate the entire dataset? This will create new synthetic data and alerts.")) return;
        
        setIsRegenerating(true);
        try {
            await regenerateDataset();
            showFeedback('Dataset regenerated successfully. Reload alerts to see changes.', 'success');
        } catch (error) {
            showFeedback('Failed to regenerate dataset. Please try again.', 'error');
        } finally {
            setIsRegenerating(false);
        }
    };

    const handleClearCases = async () => {
        if (!window.confirm("Are you sure you want to delete ALL saved cases from the database? This action cannot be undone.")) return;

        setIsClearing(true);
        try {
            await clearAllCases();
            showFeedback('All cases cleared successfully!', 'success');
        } catch (error) {
            showFeedback('Failed to clear cases. Please try again.', 'error');
        } finally {
            setIsClearing(false);
        }
    };

    const handleFileDrop = async (ev) => {
        ev.preventDefault();
        const f = ev.dataTransfer?.files?.[0];
        if (!f) return;
        setUploadBusy(true);
        setUploadResult(null);
        try {
            const isZip = f.name.toLowerCase().endsWith('.zip');
            const res = await uploadDataset(f, isZip ? null : datasetKey);
            setUploadResult(res);
            showFeedback(`Uploaded. Updated ${res.updated_files?.length || 0} files; alerts: ${res.alerts_generated ?? 0}.`, 'success');
            // Refresh metadata after upload
            const m = await getDatasetMetadata();
            setMeta(m || null);
        } catch (e) {
            showFeedback(e.message || 'Upload failed', 'error');
        } finally {
            setUploadBusy(false);
        }
    };

    const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };

    return (
        <div className="flex h-screen bg-gray-900 text-white font-sans">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-900/50 p-6 pt-24">
                    <div className="max-w-4xl mx-auto">
                        {/* Page Header */}
                        <div className="mb-8 flex items-center space-x-3 animate-fadeIn">
                            <div className="bg-purple-500/20 p-2 rounded-lg">
                                <Settings className="h-8 w-8 text-purple-400" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-100">Application Settings</h1>
                                <p className="text-gray-400">Manage your profile, API keys, and data configurations.</p>
                            </div>
                        </div>

                        {/* Feedback Message */}
                        {feedback.message && (
                            <div className={`p-4 mb-4 rounded-lg text-white ${feedback.type === 'success' ? 'bg-green-500/30' : 'bg-red-500/30'}`}>
                                {feedback.message}
                            </div>
                        )}

                        <div className="space-y-8">
                            {/* User Profile Settings */}
                            <SettingsCard title="User Profile" icon={User}>
                                {loadingSettings && (
                                    <div className="relative h-12 mb-2">
                                        <LoadingOverlay message="Loading profile..." className="h-12" />
                                    </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InputField
                                        label="Display Name"
                                        id="displayName"
                                        value={profile.displayName}
                                        onChange={handleProfileChange}
                                        placeholder="Enter your display name"
                                    />
                                    <InputField
                                        label="Email Address"
                                        id="email"
                                        type="email"
                                        value={profile.email}
                                        onChange={handleProfileChange}
                                        placeholder="your-email@anup-security-portal.gov"
                                    />
                                    <InputField
                                        label="Department"
                                        id="department"
                                        value={profile.department}
                                        onChange={handleProfileChange}
                                        placeholder="Financial Crimes Unit"
                                    />
                                    <InputField
                                        label="Badge Number"
                                        id="badge"
                                        value={profile.badge}
                                        onChange={handleProfileChange}
                                        placeholder="FC-001"
                                    />
                                </div>
                                <Button
                                    onClick={handleSaveProfile}
                                    variant="primary"
                                    icon={Save}
                                    className="w-full sm:w-auto"
                                >
                                    Save Profile
                                </Button>
                            </SettingsCard>

                            {/* API Configuration */}
                            <SettingsCard title="API Configuration" icon={Key}>
                                <div className="space-y-4">
                                    {apiKeyMasked && (
                                        <p className="text-xs text-gray-400">Current Key: <span className="font-mono">{apiKeyMasked}</span></p>
                                    )}
                                    <InputField
                                        label="Google Gemini API Key"
                                        id="apiKey"
                                        type="password"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        placeholder="Enter your Gemini API key"
                                    />
                                    <p className="text-sm text-gray-400">
                                        This API key is used for AI-powered analysis and report generation. 
                                        Get your key from the Google AI Studio.
                                    </p>
                                    <Button
                                        onClick={handleSaveApiKey}
                                        variant="primary"
                                        icon={Save}
                                        className="w-full sm:w-auto"
                                    >
                                        Update API Key
                                    </Button>
                                </div>
                            </SettingsCard>
                            
                            {/* Data Management */}
                            <SettingsCard title="Data Management" icon={Database}>
                                <div className="space-y-4">
                                    <p className="text-sm text-gray-400">
                                        Manage the synthetic dataset used by the application. Be careful, these actions are destructive.
                                    </p>

                                    {/* Drag-and-Drop Uploader */}
                                    <div
                                        onDrop={handleFileDrop}
                                        onDragOver={prevent}
                                        onDragEnter={prevent}
                                        className={`border-2 border-dashed rounded-lg p-6 text-center ${uploadBusy ? 'opacity-60' : ''} ${uploadBusy ? 'border-purple-500/60' : 'border-gray-600 hover:border-purple-500/60'}`}
                                    >
                                        <p className="text-gray-300 font-medium mb-1">Drag & drop a ZIP of CSVs here</p>
                                        <p className="text-xs text-gray-500 mb-3">Or drop a single CSV (choose which dataset it represents)</p>
                                        <div className="flex items-center justify-center gap-2 mb-3">
                                            <label className="text-xs text-gray-400">Single CSV type:</label>
                                            <select
                                                className="bg-gray-900/70 border border-gray-600 text-sm rounded px-2 py-1 text-gray-200"
                                                value={datasetKey}
                                                onChange={(e) => setDatasetKey(e.target.value)}
                                                disabled={uploadBusy}
                                            >
                                                <option value="persons">Persons.csv</option>
                                                <option value="accounts">BankAccounts.csv</option>
                                                <option value="transactions">Transactions.csv</option>
                                                <option value="companies">Companies.csv</option>
                                                <option value="directorships">Directorships.csv</option>
                                                <option value="properties">Properties.csv</option>
                                                <option value="cases">PoliceCases.csv</option>
                                            </select>
                                        </div>
                                        <input
                                            type="file"
                                            accept=".zip,.csv"
                                            disabled={uploadBusy}
                                            onChange={async (e) => {
                                                const f = e.target.files?.[0];
                                                if (!f) return;
                                                // Simulate drop handling
                                                const dt = new DataTransfer();
                                                dt.items.add(f);
                                                const ev = { preventDefault: () => {}, dataTransfer: { files: dt.files } };
                                                await handleFileDrop(ev);
                                                e.target.value = '';
                                            }}
                                            className="hidden"
                                            id="dataset-file-input"
                                        />
                                        <label htmlFor="dataset-file-input" className="inline-block bg-purple-600/60 hover:bg-purple-600 text-white text-sm font-semibold px-4 py-2 rounded cursor-pointer">
                                            {uploadBusy ? 'Uploading...' : 'Browse File'}
                                        </label>
                                        {uploadResult && (
                                            <div className="mt-3 text-xs text-gray-400">
                                                <div>Updated: {Array.isArray(uploadResult.updated_files) ? uploadResult.updated_files.join(', ') : '—'}</div>
                                                <div>Alerts generated: {uploadResult.alerts_generated ?? 0}</div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                                        <h4 className="text-yellow-400 font-semibold mb-2">⚠️ Warning</h4>
                                        <p className="text-sm text-gray-300">
                                            These operations will modify or delete data. Make sure you understand the consequences before proceeding.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Button
                                            onClick={handleRegenerate}
                                            isLoading={isRegenerating}
                                            disabled={isRegenerating || isClearing}
                                            variant="secondary"
                                            icon={RefreshCw}
                                            className="w-full"
                                        >
                                            {isRegenerating ? 'Regenerating...' : 'Regenerate Dataset'}
                                        </Button>
                                        <Button
                                            onClick={handleClearCases}
                                            isLoading={isClearing}
                                            disabled={isRegenerating || isClearing}
                                            variant="danger"
                                            icon={Trash2}
                                            className="w-full"
                                        >
                                            {isClearing ? 'Clearing...' : 'Clear All Cases'}
                                        </Button>
                                    </div>
                                </div>
                            </SettingsCard>

                            {/* About & Dataset Metadata */}
                            <SettingsCard title="About / Dataset Metadata" icon={Database}>
                                {!meta ? (
                                    <div className="relative h-12 mb-2">
                                        <LoadingOverlay message="Loading metadata..." className="h-12" />
                                    </div>
                                ) : (
                                    <div className="space-y-2 text-sm">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="text-gray-400">Seed</div>
                                            <div className="text-gray-200 font-mono">{String(meta.seed ?? 'N/A')}</div>
                                            <div className="text-gray-400">Snapshot</div>
                                            <div className="text-gray-200 font-mono">{meta.snapshot || 'N/A'}</div>
                                        </div>
                                        <div className="mt-2">
                                            <p className="text-gray-400 mb-1">Row counts</p>
                                            <div className="grid grid-cols-2 gap-1 text-xs text-gray-300">
                                                {meta.counts && Object.keys(meta.counts).sort().map(k => (
                                                    <div key={k} className="flex justify-between border-b border-gray-700/40 py-1">
                                                        <span className="text-gray-400">{k}</span>
                                                        <span className="font-mono">{meta.counts[k]}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="pt-2">
                                            <Button onClick={() => fetchSettings()} variant="secondary">Reload Metadata</Button>
                                        </div>
                                    </div>
                                )}
                            </SettingsCard>

                            {/* Appearance settings removed: dark/light mode switching is no longer available. */}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default SettingsPage;

