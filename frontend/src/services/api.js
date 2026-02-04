// The base URL for our Flask API
// Use environment variable for production deployment
import { API_BASE } from '../utils/apiBase.js';
const API_BASE_URL = API_BASE;

/**
 * Optional async token provider registered by Auth layer.
 * If set, apiRequest will await this to get a fresh JWT for each request.
 * Fallback: localStorage 'authToken'.
 */
let tokenProvider = null;

/**
 * Register a token provider function.
 * @param {() => Promise<string|null|undefined>} provider
 */
export function setTokenProvider(provider) {
  tokenProvider = typeof provider === 'function' ? provider : null;
}

async function getAuthToken() {
  try {
    if (tokenProvider) {
      const t = await tokenProvider();
      if (t) return t;
    }
  } catch {
    // ignore provider errors and fall back
  }
  try {
    return localStorage.getItem('authToken') || null;
  } catch {
    return null;
  }
}

/**
 * A generic helper function to handle API requests with authentication.
 * @param {string} endpoint - The API endpoint to call (e.g., '/alerts').
 * @param {object} options - Optional fetch options (method, body, headers).
 * @returns {Promise<any>} - The JSON response from the API.
 */
export const apiRequest = async (endpoint, options = {}) => {
  const token = await getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // If a token exists, add it to the request headers for protected routes.
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body ? JSON.stringify(options.body) : null,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API error: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/pdf')) {
      return response.blob();
    }
    
    // Handle responses that might not have a JSON body (e.g., 204 No Content)
    if (response.status === 204) {
        return null;
    }
    
    // Parse JSON and unwrap common { success, data, error } envelope if present
    const json = await response.json();
    if (json && typeof json === 'object' && 'success' in json && ('data' in json || 'error' in json)) {
      // If backend indicated success, return the data payload; otherwise throw with error
      if (json.success) return json.data;
      throw new Error(json.error || 'Unknown API error');
    }
    return json;

  } catch (error) {
    console.error(`API request to ${endpoint} failed:`, error);
    throw error;
  }
};

// --- Core API Service Functions ---

/** Fetch alerts list */
export const getAlerts = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiRequest(`/alerts${qs ? `?${qs}` : ''}`);
};
/** Investigate a person */
export const getInvestigationData = (personId) => apiRequest(`/investigate/${personId}`);
/** Create a new case */
export const createCase = (caseData) => apiRequest('/cases', { method: 'POST', body: caseData });
/** Get a single case */
export const getCase = (caseId) => apiRequest(`/cases/${caseId}`);
/** Get all cases */
export const getCases = () => apiRequest('/cases');
/** Download/generate a PDF report (returns Blob) */
export const generatePdfReport = (caseId) => apiRequest(`/report/${caseId}`);
/** Graph data */
export const getGraphData = (personId, params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiRequest(`/graph/${personId}${qs ? `?${qs}` : ''}`);
};

// --- Dataset metadata (seed, snapshot, counts) ---
export const getDatasetMetadata = () => apiRequest('/datasets/metadata');
export const uploadDataset = async (file, datasetKey = null) => {
  const token = await (async () => {
    try { return localStorage.getItem('authToken') || null; } catch { return null; }
  })();
  const form = new FormData();
  form.append('file', file);
  if (datasetKey) form.append('dataset', datasetKey);
  const res = await fetch(`${API_BASE_URL}/datasets/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || res.statusText);
  return json?.data ?? json;
};

// --- Analysis controls ---
export const runAnalysis = () => apiRequest('/run-analysis', { method: 'POST' });
export const getAnalysisStatus = () => apiRequest('/run-analysis/status');


// --- NEW: API Functions for the Settings Page ---

/**
 * Sends a request to the backend to regenerate the entire synthetic dataset.
 */
export const regenerateDataset = () => {
  return apiRequest('/settings/regenerate-data', {
    method: 'POST',
  });
};

/**
 * Sends a request to the backend to delete all cases from Firestore.
 */
export const clearAllCases = () => {
  return apiRequest('/settings/clear-cases', {
    method: 'POST',
  });
};

/** Profile settings */
export const getProfile = () => apiRequest('/settings/profile');
export const updateProfile = (profile) => apiRequest('/settings/profile', { method: 'POST', body: profile });
/**
 * Returns masked API key info
 * { apiKeyMasked: 'AIza...XYZ' }
 */
export const getApiKeyMasked = () => apiRequest('/settings/api-key');
export const updateApiKey = (apiKey) => apiRequest('/settings/api-key', { method: 'POST', body: { apiKey } });
// Theme endpoints removed from frontend

// --- Case notes ---
export const getCaseNotes = (caseId) => apiRequest(`/cases/${caseId}/notes`);
export const updateCaseNotes = (caseId, notes) => apiRequest(`/cases/${caseId}/notes`, { method: 'PUT', body: { notes } });

// Notifications feature removed


// --- Authentication Mock ---
// In a real app, this would make a POST request to a /login endpoint.
export const loginUser = async () => {
  // Simulated login for demo only
    // This is a dummy token for demonstration purposes. Your backend would generate a real one.
    const dummyToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
    localStorage.setItem('authToken', dummyToken);
    return { success: true, token: dummyToken };
};

