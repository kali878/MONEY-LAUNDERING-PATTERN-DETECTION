import os
import json
import threading
import logging
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
import pandas as pd
import subprocess # We'll use this to run our data generation script
import zipfile
import io
from werkzeug.utils import secure_filename

# Import all our custom services and utilities
from utils.data_loader import DataLoader
from utils.auth import token_required
from services.risk_scoring import HybridRiskScorer
from services.ai_summarizer import AI_Summarizer
from services.graph_analysis import GraphAnalyzer
from services.report_generator import ReportGenerator
from services.case_manager import CaseManager

# --- APPLICATION SETUP & SERVICE INITIALIZATION ---
app = Flask(__name__)

# Logging setup
logging.basicConfig(level=os.getenv('LOG_LEVEL', 'INFO').upper(), format='[%(levelname)s] %(message)s')
logger = app.logger

# Configure CORS for production and development
raw_frontend_url = os.environ.get('FRONTEND_URL', 'https://anupsecurityportal-ai.vercel.app/')
# Normalize: remove trailing slash and whitespace
frontend_url = raw_frontend_url.strip().rstrip('/')
allowed_origins = [
    'http://localhost:3000', 'http://127.0.0.1:3000',
    'http://localhost:5173', 'http://127.0.0.1:5173',
    frontend_url,  # canonical (no slash)
]
# Also add explicit trailing slash variant to be safe (some mis-configured CORS libs compare literally)
allowed_origins.append(frontend_url + '/')

# Remove duplicates and None values
allowed_origins = list(set(filter(None, allowed_origins)))

logger.info(f"Configuring CORS for origins: {allowed_origins}")
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

@app.before_request
def _cors_debug_log():
    # Lightweight debug to help diagnose production fetch issues (only first few prints to avoid noise)
    if not hasattr(app, '_cors_debug_count'):
        app._cors_debug_count = 0
    if app._cors_debug_count < 25:  # cap logging
        origin = request.headers.get('Origin')
        logger.debug(f"[CORS-DEBUG] Origin={origin} Path={request.path}")
        app._cors_debug_count += 1

logger.info("Initializing Project AnupSecurityPortal Backend Services...")
DATA_PATH = os.path.join(os.path.dirname(__file__), 'generated-data')
# Point to the in-repo generator within backend/ to avoid missing path issues
DATA_GENERATION_SCRIPT_PATH = os.path.join(os.path.dirname(__file__), 'data-generation', 'generate_data.py')

data_loader = DataLoader(data_path=DATA_PATH)
all_datasets = data_loader.load_all_data()

risk_scorer = HybridRiskScorer(all_datasets)
ai_summarizer = AI_Summarizer()
graph_analyzer = GraphAnalyzer()
# Attach metadata to datasets dict for downstream consumers (e.g., reports)
try:
    md = data_loader.get_metadata()
    if isinstance(all_datasets, dict):
        all_datasets['metadata'] = md
except Exception as _e:
    logger.warning(f"Failed to attach metadata: {_e}")

report_generator = ReportGenerator(all_datasets)
case_manager = CaseManager()

logger.info("All services initialized successfully. Backend is ready.")

# --- Simple local settings persistence (non-sensitive demo storage) ---
SETTINGS_FILE = os.path.join(os.path.dirname(__file__), 'app_settings.json')

def _load_settings():
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Failed to load settings file: {e}")
    return {
        "profile": {"displayName": "Senior Investigator", "email": ".com", "department": "Financial Crimes Unit", "badge": "FC-001"},
        "apiKey": "",
        "theme": "dark"
    }

def _save_settings(data):
    try:
        with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2) # Corrected this line
        return True
    except Exception as e:
        logger.warning(f"Failed to save settings: {e}")
        return False

# --- Response helpers and error handlers ---
def api_ok(data=None, status=200):
    return jsonify({"success": True, "data": data, "error": None}), status

def api_err(message, status=400):
    return jsonify({"success": False, "data": None, "error": message}), status

@app.errorhandler(400)
def _bad_request(e):
    return api_err("Bad Request", 400)

@app.errorhandler(401)
def _unauthorized(e):
    return api_err("Unauthorized", 401)

@app.errorhandler(403)
def _forbidden(e):
    return api_err("Forbidden", 403)

@app.errorhandler(404)
def _not_found(e):
    return api_err("Not Found", 404)

@app.errorhandler(500)
def _server_error(e):
    return api_err("Internal Server Error", 500)

# --- API ENDPOINTS (Existing endpoints remain the same) ---

@app.route('/api/health', methods=['GET'])
def health_check():
    return api_ok({"status": "healthy", "message": "Project AnupSecurityPortal backend is running."})

@app.route('/api/datasets/metadata', methods=['GET'])
@token_required
def dataset_metadata():
    try:
        meta = data_loader.get_metadata() or {}
        return api_ok(meta)
    except Exception as e:
        logger.error(f"ERROR in /api/datasets/metadata: {e}")
        return api_ok({"status": "partial_success", "files": 8})

# --- Dataset upload (CSV or ZIP) ---
ALLOWED_DATASETS = {
    'persons': 'Persons.csv',
    'accounts': 'BankAccounts.csv',
    'transactions': 'Transactions.csv',
    'companies': 'Companies.csv',
    'directorships': 'Directorships.csv',
    'properties': 'Properties.csv',
    'cases': 'PoliceCases.csv'
}

def _validate_csv_schema(dataset_key: str, df: pd.DataFrame):
    required = data_loader.schemas.get(dataset_key)
    if not required:
        return True
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"{dataset_key} missing columns: {', '.join(missing)}")
    return True

@app.route('/api/datasets/upload', methods=['POST'])
@token_required
def upload_dataset():
    """Accept a CSV (with dataset param) or a ZIP of CSVs matching expected names.

    - CSV: requires form field 'dataset' in {persons,accounts,transactions,companies,directorships,properties,cases}
    - ZIP: files named as in ALLOWED_DATASETS will overwrite existing datasets
    After upload, reload datasets and run analysis to refresh alerts.
    """
    if 'file' not in request.files:
        return api_err("No file uploaded. Use form field 'file'.", 400)
    file = request.files['file']
    if file.filename == '':
        return api_err("Empty filename.", 400)

    filename = secure_filename(file.filename)
    updated = []
    try:
        if filename.lower().endswith('.zip'):
            # Process ZIP: extract to memory and write matching CSVs
            with zipfile.ZipFile(io.BytesIO(file.read())) as zf:
                names = zf.namelist()
                for key, target in ALLOWED_DATASETS.items():
                    # Find case-insensitive match
                    match = next((n for n in names if n.lower().endswith(target.lower())), None)
                    if not match:
                        continue
                    with zf.open(match) as member:
                        df = pd.read_csv(member)
                        _validate_csv_schema(key, df)
                        out_path = os.path.join(DATA_PATH, target)
                        df.to_csv(out_path, index=False)
                        updated.append(target)
        else:
            # Single CSV: need dataset param
            dataset_key = request.form.get('dataset', '').strip().lower()
            if dataset_key not in ALLOWED_DATASETS:
                return api_err("For CSV uploads, provide form field 'dataset' with a valid dataset name.", 400)
            df = pd.read_csv(file)
            _validate_csv_schema(dataset_key, df)
            out_path = os.path.join(DATA_PATH, ALLOWED_DATASETS[dataset_key])
            df.to_csv(out_path, index=False)
            updated.append(ALLOWED_DATASETS[dataset_key])

        if not updated:
            return api_err("No recognized CSVs found in upload.", 400)

        # Reload datasets and rerun analysis
        global all_datasets, risk_scorer, report_generator
        all_datasets = data_loader.load_all_data()
        risk_scorer = HybridRiskScorer(all_datasets)
        alerts = risk_scorer.run_full_analysis() or []
        report_generator = ReportGenerator(all_datasets)

        return api_ok({
            "updated_files": updated,
            "alerts_generated": len(alerts)
        }, 200)
    except ValueError as ve:
        logger.error(f"[UPLOAD] Schema validation failed: {ve}")
        return api_err(str(ve), 400)
    except zipfile.BadZipFile:
        return api_err("Invalid ZIP file.", 400)
    except Exception as e:
        logger.error(f"[UPLOAD] Failed: {e}")
        return api_err("Failed to process uploaded data.", 500)

# ... (all your other endpoints like /api/alerts, /api/investigate, etc., go here) ...
@app.route('/api/persons', methods=['GET'])
@token_required
def search_persons():
    search_query = request.args.get('q', '')
    # Minimal validation: require at least 2 non-space chars
    if not isinstance(search_query, str) or len(search_query.strip()) < 2:
        return api_err("Query 'q' must be at least 2 characters.", 400)
    try:
        search_results = risk_scorer.search_persons(search_query)
        # Return plain array for frontend compatibility
        return jsonify(search_results), 200
    except Exception as e:
        logger.error(f"ERROR in /api/persons: {e}")
        return jsonify({"error": "Failed to search for persons."}), 500

@dataclass
class AnalysisState:
    running: bool = False
    started_at: str | None = None
    completed_at: str | None = None
    alerts_generated: int | None = None
    error: str | None = None

analysis_state = AnalysisState()
_analysis_lock = threading.Lock()

def _background_full_analysis():
    global analysis_state
    try:
        # Traceability: include dataset seed/snapshot in logs if available
        try:
            _md = data_loader.get_metadata() or {}
            _seed = _md.get('seed')
            _snap = _md.get('snapshot')
            logger.info(f"[ANALYSIS] Background full analysis started... (seed={_seed}, snapshot={_snap})")
        except Exception:
            logger.info("[ANALYSIS] Background full analysis started...")
        results = risk_scorer.run_full_analysis()
        with _analysis_lock:
            analysis_state.running = False
            analysis_state.completed_at = datetime.now(timezone.utc).isoformat()
            analysis_state.alerts_generated = len(results)
            analysis_state.error = None
        try:
            _md = data_loader.get_metadata() or {}
            _seed = _md.get('seed')
            _snap = _md.get('snapshot')
            logger.info(f"[ANALYSIS] Completed. {len(results)} alerts generated. (seed={_seed}, snapshot={_snap})")
        except Exception:
            logger.info(f"[ANALYSIS] Completed. {len(results)} alerts generated.")
    except Exception as e:
        with _analysis_lock:
            analysis_state.running = False
            analysis_state.completed_at = datetime.now(timezone.utc).isoformat()
            analysis_state.error = str(e)
        logger.error(f"ERROR in background analysis: {e}")

@app.route('/api/run-analysis/status', methods=['GET'])
@token_required
def run_analysis_status():
    # Return current state; hide None values for cleanliness
    with _analysis_lock:
        state_dict = asdict(analysis_state)
        state_copy = {k: v for k, v in state_dict.items() if v is not None}
    return api_ok(state_copy)

@app.route('/api/run-analysis', methods=['POST'])
@token_required
def run_analysis():
    """Trigger a full analysis.
    Modes:
      - Async (default): returns 202 quickly and performs work in background thread.
      - Sync: pass query param sync=1 to run inline (may timeout on free hosting).
    """
    sync_mode = request.args.get('sync') == '1'
    try:
        if sync_mode:
            try:
                _md = data_loader.get_metadata() or {}
                _seed = _md.get('seed')
                _snap = _md.get('snapshot')
                logger.info(f"[ANALYSIS] Synchronous run requested... (seed={_seed}, snapshot={_snap})")
            except Exception:
                logger.info("[ANALYSIS] Synchronous run requested...")
            results = risk_scorer.run_full_analysis()
            with _analysis_lock:
                analysis_state.running = False
                analysis_state.started_at = analysis_state.started_at or datetime.now(timezone.utc).isoformat()
                analysis_state.completed_at = datetime.now(timezone.utc).isoformat()
                analysis_state.alerts_generated = len(results)
                analysis_state.error = None
            return api_ok({
                "message": f"Full risk analysis complete. {len(results)} alerts generated.",
                "alerts_generated": len(results),
                "mode": "sync"
            }, 200)
        # Async path
        with _analysis_lock:
            if analysis_state.running:
                return api_ok({
                    'message': 'Analysis already running.',
                    'running': True,
                    'started_at': analysis_state.started_at
                }, 202)
            # Initialize state and launch thread
            analysis_state.running = True
            analysis_state.started_at = datetime.now(timezone.utc).isoformat()
            analysis_state.completed_at = None
            analysis_state.alerts_generated = None
            analysis_state.error = None
        t = threading.Thread(target=_background_full_analysis, daemon=True)
        t.start()
        return api_ok({
            'message': 'Full risk analysis started in background.',
            'running': True,
            'mode': 'async'
        }, 202)
    except Exception as e:
        logger.error(f"ERROR in /api/run-analysis: {e}")
        return api_err(str(e), 500)

# Cached Alerts CSV loader
_alerts_cache = {"mtime": None, "data": None}

def _load_alerts_cached():
    alerts_path = os.path.join(DATA_PATH, 'AlertScores.csv')
    if not os.path.exists(alerts_path):
        return alerts_path, None
    mtime = os.path.getmtime(alerts_path)
    if _alerts_cache["mtime"] == mtime and _alerts_cache["data"] is not None:
        return alerts_path, _alerts_cache["data"]
    df = pd.read_csv(alerts_path)
    _alerts_cache["mtime"] = mtime
    _alerts_cache["data"] = df
    return alerts_path, df

@app.route('/api/alerts', methods=['GET'])
@token_required
def get_alerts():
    try:
        alerts_path, alerts_df = _load_alerts_cached()
        logger.debug(f"[ALERTS] Looking for alerts at: {alerts_path}")
        if alerts_df is None:
            logger.info("[ALERTS] AlertScores.csv not found")
            return jsonify([]), 200

        # If final_risk_score missing but risk_score present, align columns
        if 'final_risk_score' not in alerts_df.columns and 'risk_score' in alerts_df.columns:
            alerts_df['final_risk_score'] = alerts_df['risk_score']
        if 'risk_score' not in alerts_df.columns and 'final_risk_score' in alerts_df.columns:
            alerts_df['risk_score'] = alerts_df['final_risk_score']
        # Force integer types for consistency
        for col in ['final_risk_score','risk_score']:
            if col in alerts_df.columns:
                try:
                    alerts_df[col] = alerts_df[col].fillna(0).astype(int)
                except Exception:
                    pass

        # Check if there's actual data (rows) after normalization
        if len(alerts_df) == 0:
            logger.info("[ALERTS] AlertScores.csv is empty (no data rows)")
            # Check if demo mode is requested
            demo_mode = request.args.get('demo', 'false').lower() == 'true'

            if demo_mode:
                logger.info("No alert data found, returning mock data for demo")
                # Return mock alert data for demonstration
                mock_alerts = [
                    {
                        "alert_id": "ALT-001",
                        "person_id": "PER-001",
                        "full_name": "Rohan Mehra",
                        "final_risk_score": 92,
                        "risk_score": 92,
                        "timestamp": "2025-08-31T12:34:56Z",
                        "summary": "High-value property purchase inconsistent with declared income and links to shell companies.",
                        "status": "active"
                    },
                    {
                        "alert_id": "ALT-002", 
                        "person_id": "PER-002",
                        "full_name": "Priya Sharma",
                        "final_risk_score": 87,
                        "risk_score": 87,
                        "timestamp": "2025-08-30T09:15:22Z",
                        "summary": "Multiple cash deposits under reporting threshold detected (Structuring).",
                        "status": "active"
                    },
                    {
                        "alert_id": "ALT-003",
                        "person_id": "PER-003", 
                        "full_name": "Vikram Singh",
                        "final_risk_score": 75,
                        "risk_score": 75,
                        "timestamp": "2025-08-29T16:42:11Z",
                        "summary": "Transactions identified with newly incorporated company with low paid-up capital.",
                        "status": "active"
                    },
                    {
                        "alert_id": "ALT-004",
                        "person_id": "PER-004",
                        "full_name": "Anjali Verma", 
                        "final_risk_score": 81,
                        "risk_score": 81,
                        "timestamp": "2025-08-28T14:18:33Z",
                        "summary": "Unusual international wire transfers to high-risk jurisdictions without clear business purpose.",
                        "status": "active"
                    },
                    {
                        "alert_id": "ALT-005",
                        "person_id": "PER-005",
                        "full_name": "Rajesh Gupta",
                        "final_risk_score": 69,
                        "risk_score": 69, 
                        "timestamp": "2025-08-27T11:55:17Z",
                        "summary": "Complex layered transactions through multiple shell companies to obscure fund origins.",
                        "status": "active"
                    }
                ]
                return jsonify(mock_alerts), 200
            else:
                logger.info("No alert data found, returning empty array")
                return jsonify([]), 200

        # We have data, proceed normally
        logger.info(f"[ALERTS] Found {len(alerts_df)} alerts in CSV file")

        # Get limit parameter
        limit = int(request.args.get('limit', 50))

        # Sort by risk_score and get top alerts
        top_alerts_df = alerts_df.nlargest(limit, 'risk_score')
        alerts = top_alerts_df.to_dict(orient='records')
        logger.info(f"[ALERTS] Returning {len(alerts)} alerts (limited to {limit})")
        return jsonify(alerts), 200

    except Exception as e:
        logger.error(f"[ALERTS] ERROR in /api/alerts: {e}")
        return api_err("Failed to retrieve alerts.", 500)


# Add a simple alerts endpoint without authentication for debugging
@app.route('/api/alerts-debug', methods=['GET'])
def get_alerts_debug():
    try:
        logger.debug(f"[ALERTS-DEBUG] Request received")
        alerts_path, alerts_df = _load_alerts_cached()
        logger.debug(f"[ALERTS-DEBUG] Looking for alerts at: {alerts_path}")
        if alerts_df is None:
            logger.info("[ALERTS-DEBUG] AlertScores.csv not found")
            return jsonify([]), 200
        logger.debug(f"[ALERTS-DEBUG] Loaded alerts DataFrame with shape: {alerts_df.shape}")

        if len(alerts_df) == 0:
            logger.info("[ALERTS-DEBUG] No alerts found")
            return jsonify([]), 200

        # Get limit parameter
        limit = int(request.args.get('limit', 10))

        # Sort by risk_score and get top alerts
        top_alerts_df = alerts_df.nlargest(limit, 'risk_score')
        alerts = top_alerts_df.to_dict(orient='records')
        logger.debug(f"[ALERTS-DEBUG] Returning {len(alerts)} alerts")
    except Exception as e:
        logger.error(f"[ALERTS-DEBUG] ERROR: {e}")
        return api_err("Failed to retrieve alerts.", 500)

@app.route('/api/test-alerts', methods=['GET'])
def test_alerts():
    """Test endpoint to verify alert generation without authentication"""
    try:
        alerts_path = os.path.join(DATA_PATH, 'AlertScores.csv')
        logger.debug(f"[TEST-ALERTS] Looking for alerts at: {alerts_path}")
        
        if os.path.exists(alerts_path):
            alerts_df = pd.read_csv(alerts_path)
            logger.debug(f"[TEST-ALERTS] Found {len(alerts_df)} alerts")
            logger.debug(f"[TEST-ALERTS] Columns: {list(alerts_df.columns)}")
            
            # Test the same logic as the main alerts endpoint
            if len(alerts_df) == 0:
                return jsonify({
                    "alerts_file_exists": True,
                    "alerts_count": 0,
                    "message": "File exists but is empty"
                })
            
            # Get top 5 alerts by risk score
            top_alerts_df = alerts_df.nlargest(5, 'risk_score')
            alerts = top_alerts_df.to_dict(orient='records')
            
            return jsonify({
                "alerts_file_exists": True,
                "alerts_count": len(alerts_df),
                "columns": list(alerts_df.columns),
                "top_5_alerts": alerts,
                "sample_alert": alerts_df.iloc[0].to_dict() if len(alerts_df) > 0 else None
            })
        else:
            logger.debug(f"[TEST-ALERTS] AlertScores.csv not found at {alerts_path}")
            return jsonify({"alerts_file_exists": False, "path_checked": alerts_path})
    except Exception as e:
        logger.error(f"[TEST-ALERTS] Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)})

@app.route('/api/investigate/<string:person_id>', methods=['GET'])
@token_required
def investigate_person(person_id):
    try:
        logger.info(f"[INVESTIGATE] Fetching risk details for {person_id}")
        risk_details = risk_scorer.get_person_risk_details(person_id)
        if not risk_details:
            logger.warning(f"[INVESTIGATE] No risk details for {person_id}")
            return api_err("Person ID not found or has no risk score.", 404)
        summary = ai_summarizer.generate_summary_from_details(risk_details)
        response_data = {
            "person_id": person_id, "risk_profile": risk_details, "ai_summary": summary
        }
        logger.info(f"[INVESTIGATE] Returning investigation bundle for {person_id}")
        return jsonify(response_data), 200
    except Exception as e:
        logger.error(f"ERROR in /api/investigate/{person_id}: {e}")
        return api_err("Failed to fetch investigation data.", 500)

@app.route('/api/cases', methods=['GET', 'POST'])
@token_required
def handle_cases():
    if request.method == 'GET':
        try:
            logger.info("[CASES] Listing all cases")
            all_cases = case_manager.get_all_cases()
            return api_ok(all_cases)
        except Exception as e:
            logger.error(f"ERROR in /api/cases [GET]: {e}")
            return api_err("An unexpected error occurred while fetching cases.", 500)
            
    elif request.method == 'POST':
        case_data = request.get_json(silent=True) or {}
        # Minimal validation
        if not isinstance(case_data, dict):
            return api_err("Invalid JSON body.", 400)
        person_id = case_data.get('person_id') or case_data.get('risk_profile', {}).get('person_details', {}).get('person_id')
        if not person_id:
            return api_err("'person_id' is required in body or risk_profile.person_details.", 400)
        try:
            logger.info("[CASES] Creating new case")
            case_id = case_manager.create_case(case_data)
            if case_id:
                logger.info(f"[CASES] Created case {case_id}")
                return api_ok({"message": "Case created successfully.", "case_id": case_id}, 201)
            else:
                return api_err("Failed to create case in database.", 500)
        except Exception as e:
            logger.error(f"ERROR in /api/cases [POST]: {e}")
            return api_err("An unexpected error occurred.", 500)

@app.route('/api/cases/<string:case_id>', methods=['GET'])
@token_required
def get_case(case_id):
    try:
        logger.info(f"[CASES] Fetching case {case_id}")
        case = case_manager.get_case(case_id)
        if case:
            return api_ok(case)
        else:
            return api_err("Case not found.", 404)
    except Exception as e:
        logger.error(f"ERROR in /api/cases/{case_id} GET: {e}")
        return api_err("An unexpected error occurred.", 500)

NOTES_STORE_PATH = os.path.join(os.path.dirname(__file__), 'generated-data', 'case_notes.json')

def _read_local_notes():
    try:
        if os.path.exists(NOTES_STORE_PATH):
            with open(NOTES_STORE_PATH, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        logger.warning(f"Failed reading local notes store: {e}")
    return {}

def _write_local_notes(data):
    try:
        os.makedirs(os.path.dirname(NOTES_STORE_PATH), exist_ok=True)
        with open(NOTES_STORE_PATH, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        logger.warning(f"Failed writing local notes store: {e}")
    return False

@app.route('/api/cases/<string:case_id>/notes', methods=['GET', 'PUT'])
@token_required
def case_notes(case_id):
    try:
        if request.method == 'GET':
            logger.info(f"[NOTES] Get notes for case {case_id}")
            case = case_manager.get_case(case_id)
            firestore_notes = case.get('notes') if case else None
            if firestore_notes is not None:
                return api_ok({"case_id": case_id, "notes": firestore_notes, "source": "firestore"})
            # Fallback to local file
            local_notes_map = _read_local_notes()
            notes_text = local_notes_map.get(case_id, '')
            if case is None and not notes_text:
                return api_err("Case not found.", 404)
            return api_ok({"case_id": case_id, "notes": notes_text, "source": "local"})
        else:  # PUT
            body = request.get_json() or {}
            notes = body.get('notes')
            if notes is None:
                return api_err("'notes' field is required.", 400)
            logger.info(f"[NOTES] Update notes for case {case_id}")
            updated = case_manager.update_case_notes(case_id, notes)
            # Always also persist locally as fallback
            local_notes_map = _read_local_notes()
            local_notes_map[case_id] = notes
            _write_local_notes(local_notes_map)
            if not updated:
                # Firestore failed but local saved
                return api_ok({"message": "Notes saved locally (Firestore unavailable).", "fallback": True})
            return api_ok({"message": "Notes saved successfully.", "fallback": False})
    except Exception as e:
        logger.error(f"ERROR in /api/cases/{case_id}/notes: {e}")
        return api_err("Failed to process notes request.", 500)

@app.route('/api/graph/<string:person_id>', methods=['GET'])
@token_required
def get_graph_data(person_id):
    """Return transaction network for an entity. Always 200 with empty graph if no data.

    Query params:
      limit: optional int (default 100) max 500
    """
    try:
        try:
            limit = int(request.args.get('limit', 100))
        except ValueError:
            limit = 100
        limit = max(1, min(limit, 500))

        network_data = graph_analyzer.get_transaction_network(person_id, limit=limit)
        if not network_data or not network_data.get("nodes"):
            # --- Fallback: synthesize a tiny network from CSV data (no Neo4j) ---
            try:
                synthesized = _synthesize_csv_graph(person_id)
                if synthesized is not None:
                    return jsonify(synthesized), 200
            except Exception as synth_err:
                logger.warning(f"Failed to synthesize fallback graph for {person_id}: {synth_err}")
            # Return empty graph if synthesis not possible
            return jsonify({
                "person_id": person_id,
                "nodes": [],
                "edges": [],
                "message": f"No transaction network found for {person_id}."
            }), 200
        # Attach person_id for consistency
        network_data["person_id"] = person_id
        return jsonify(network_data), 200
    except Exception as e:
        logger.error(f"ERROR in /api/graph/{person_id}: {e}")
        return api_err("Failed to fetch graph data from Neo4j.", 500)

# --- helpers ---
def _synthesize_csv_graph(person_id: str):
    """Build a tiny graph from CSVs as a fallback when Neo4j has no data.
    Returns a dict with nodes/edges or None if not possible.
    """
    persons_df = all_datasets.get('persons')
    accounts_df = all_datasets.get('accounts')
    tx_df = all_datasets.get('transactions')
    if persons_df is None or accounts_df is None or tx_df is None:
        return None
    # Find accounts belonging to this person
    person_accounts = accounts_df[accounts_df['owner_id'] == person_id]['account_number'].tolist()
    if not person_accounts:
        return None
    # Get up to N related transactions where person is source or target
    related_tx = tx_df[(tx_df['from_account'].isin(person_accounts)) | (tx_df['to_account'].isin(person_accounts))].head(25)
    if related_tx.empty:
        return None
    # Map counterpart accounts -> owners
    counterpart_accounts = set()
    for _, row in related_tx.iterrows():
        if row['from_account'] in person_accounts:
            counterpart_accounts.add(row['to_account'])
        if row['to_account'] in person_accounts:
            counterpart_accounts.add(row['from_account'])
    counterpart_owners = accounts_df[accounts_df['account_number'].isin(list(counterpart_accounts))]
    # Build nodes
    nodes = []
    person_row = persons_df[persons_df['person_id'] == person_id]
    label = person_row.iloc[0]['full_name'] if not person_row.empty else person_id
    nodes.append({"id": person_id, "label": label, "type": "Person", "isCenter": True})
    for _, acct in counterpart_owners.iterrows():
        owner_id = acct['owner_id']
        if owner_id == person_id:
            continue
        owner_row = persons_df[persons_df['person_id'] == owner_id]
        owner_label = owner_row.iloc[0]['full_name'] if not owner_row.empty else owner_id
        # Avoid duplicates
        if not any(n['id'] == owner_id for n in nodes):
            nodes.append({"id": owner_id, "label": owner_label, "type": "Person", "isCenter": False})
    # Build edges (aggregate amounts per counterpart for brevity)
    edges_map = {}
    for _, tx in related_tx.iterrows():
        src_is_person = tx['from_account'] in person_accounts
        dst_is_person = tx['to_account'] in person_accounts
        if src_is_person or dst_is_person:
            counterpart_acct = tx['to_account'] if src_is_person else tx['from_account']
            counterpart_owner_row = accounts_df[accounts_df['account_number'] == counterpart_acct]
            if counterpart_owner_row.empty:
                continue
            counterpart_owner = counterpart_owner_row.iloc[0]['owner_id']
            if counterpart_owner == person_id:
                continue
            key = counterpart_owner
            amt = int(tx['amount_inr']) if not pd.isna(tx['amount_inr']) else 0
            if key not in edges_map:
                edges_map[key] = {"amount": 0, "isOutgoing": src_is_person}
            edges_map[key]["amount"] += amt
    edges = []
    for target_id, meta in edges_map.items():
        edges.append({
            "source": person_id,
            "target": target_id,
            "label": f"₹{meta['amount']:,}",
            "isOutgoing": meta['isOutgoing']
        })
    synthesized = {"person_id": person_id, "nodes": nodes, "edges": edges, "message": "Synthesized network (Neo4j unavailable or no data)."}
    return synthesized

@app.route('/api/report/<string:person_or_case_id>', methods=['GET'])
@token_required
def generate_report(person_or_case_id):
    try:
        logger.info(f"[REPORT] Generate report for {person_or_case_id}")
        # First, attempt as person_id
        risk_details = risk_scorer.get_person_risk_details(person_or_case_id)
        resolved_person_id = person_or_case_id

        # Fallback: if not found, treat input as case_id and resolve person_id from stored case
        if not risk_details:
            try:
                case = case_manager.get_case(person_or_case_id)
                pid = None
                if isinstance(case, dict):
                    pid = case.get('person_id') or case.get('risk_profile', {}).get('person_details', {}).get('person_id')
                if pid:
                    logger.info(f"[REPORT] Resolved case {person_or_case_id} to person_id {pid}")
                    risk_details = risk_scorer.get_person_risk_details(pid)
                    resolved_person_id = pid
            except Exception as _res_err:
                logger.warning(f"[REPORT] Could not resolve case/person: {_res_err}")
        if not risk_details:
            return api_err("Cannot generate report. Person ID not found.", 404)
        # Harmonize: ensure we use the canonical alert score (from AlertScores.csv) so PDF matches dashboard
        try:
            alerts_path = os.path.join(DATA_PATH, 'AlertScores.csv')
            if os.path.exists(alerts_path):
                alerts_df = pd.read_csv(alerts_path)
                row = alerts_df[alerts_df['person_id'] == resolved_person_id]
                if not row.empty:
                    canonical_score = int(row.iloc[0].get('final_risk_score', row.iloc[0].get('risk_score', 0)))
                    # Only override if canonical differs; keep recalculated score accessible for debugging
                    risk_details['final_risk_score'] = canonical_score
                    risk_details['canonical_alert_score'] = canonical_score
                    logger.info(f"[REPORT] Using canonical score {canonical_score} for {resolved_person_id} (recalc {risk_details.get('recalculated_risk_score')})")
                else:
                    logger.info(f"[REPORT] No canonical alert row found for {resolved_person_id}, using recalculated {risk_details.get('final_risk_score')}")
        except Exception as _harm_err:
            logger.warning(f"Failed to harmonize PDF score for {resolved_person_id}: {_harm_err}")
        summary = ai_summarizer.generate_summary_from_details(risk_details)
        pdf_path = report_generator.generate_pdf(resolved_person_id, risk_details, summary)
        if not pdf_path or not os.path.exists(pdf_path):
            debug = request.args.get('debug') == '1' or os.environ.get('ANUP_SECURITY_PORTAL_REPORT_DEBUG') == '1'
            msg = {"error": "Failed to create the PDF report on the server."}
            if debug:
                msg["details"] = "PDF generation returned no path. Check server logs for 'FATAL ERROR during primary PDF generation' entries."
            return jsonify(msg), 500
        return send_file(pdf_path, as_attachment=True, download_name=f"Investigation_Report_{resolved_person_id}.pdf", mimetype='application/pdf')
    except Exception as e:
        logger.error(f"ERROR in /api/report/{person_or_case_id}: {e}")
        debug = request.args.get('debug') == '1' or os.environ.get('ANUP_SECURITY_PORTAL_REPORT_DEBUG') == '1'
        msg = {"error": "Failed to generate PDF report."}
        if debug:
            import traceback
            msg['details'] = traceback.format_exc()
        return jsonify(msg), 500
        
# --- NEW: Settings & Data Management Endpoints ---
@app.route('/api/settings/regenerate-data', methods=['POST'])
@token_required
def regenerate_data():
    """
    Triggers the data generation script to create a new synthetic dataset.
    """
    try:
        logger.info("[SETTINGS] Regenerate dataset requested")
        # We use subprocess to run the script in a way that doesn't block the server
        # for too long. For a hackathon, this is a very effective demonstration.
        # Use the same Python interpreter to avoid PATH issues
        import sys
        process = subprocess.Popen([sys.executable, DATA_GENERATION_SCRIPT_PATH], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        stdout, stderr = process.communicate()

        if process.returncode == 0:
            # Important: After generating new data, we must reload it into our services
            logger.info("[SETTINGS] Data regeneration successful. Reloading services...")
            global all_datasets, risk_scorer, report_generator
            all_datasets = data_loader.load_all_data()
            risk_scorer = HybridRiskScorer(all_datasets)
            # Run analysis so alerts are refreshed immediately
            try:
                alerts = risk_scorer.run_full_analysis() or []
                alerts_count = len(alerts)
            except Exception as _ra_err:
                logger.warning(f"[SETTINGS] Analysis after regeneration failed: {_ra_err}")
                alerts_count = None
            report_generator = ReportGenerator(all_datasets)
            logger.info("[SETTINGS] Services reloaded with new data.")
            payload = {"message": "New synthetic dataset generated and loaded successfully."}
            if alerts_count is not None:
                payload["alerts_generated"] = alerts_count
            return jsonify(payload), 200
        else:
            try:
                logger.error(f"ERROR during data regeneration: {stderr.decode()}")
                if stdout:
                    logger.error(f"[regen stdout] {stdout.decode()}")
            except Exception:
                pass
            return api_err("Failed to regenerate dataset.", 500)
            
    except Exception as e:
        logger.error(f"ERROR in /api/settings/regenerate-data: {e}")
        return api_err("An unexpected error occurred during data regeneration.", 500)

@app.route('/api/settings/clear-cases', methods=['POST'])
@token_required
def clear_all_cases():
    """
    Deletes all case files from the Firestore database.
    """
    try:
        logger.info("[SETTINGS] Clear all cases requested")
        deleted_count = case_manager.clear_all_cases()
        return jsonify({"message": f"Successfully deleted {deleted_count} cases from Firestore."}), 200
    except Exception as e:
        logger.error(f"ERROR in /api/settings/clear-cases: {e}")
        return api_err("An unexpected error occurred while clearing cases.", 500)

@app.route('/api/settings/profile', methods=['GET','POST'])
@token_required
def settings_profile():
    settings = _load_settings()
    if request.method == 'GET':
        return jsonify(settings.get('profile', {})), 200
    body = request.get_json(force=True, silent=True) or {}
    logger.debug(f"[PROFILE] Incoming profile update body: {body}")
    missing = [k for k in ['displayName','email'] if k not in body]
    if missing:
        return api_err(f"Missing required fields: {', '.join(missing)}", 400)
    profile = settings.get('profile', {})
    for k in ['displayName','email','department','badge']:
        if k in body:
            profile[k] = body[k]
    settings['profile'] = profile
    if not _save_settings(settings):
        return api_err("Failed to persist profile settings", 500)
    logger.info(f"[PROFILE] Updated profile saved for {profile.get('email','unknown')}")
    return jsonify({"message": "Profile updated", "profile": profile}), 200

@app.route('/api/settings/api-key', methods=['GET','POST'])
@token_required
def settings_api_key():
    settings = _load_settings()
    if request.method == 'GET':
        key = settings.get('apiKey','')
        masked = key[:4] + '...' + key[-4:] if len(key) > 8 else key
        return jsonify({"apiKeyMasked": masked, "configured": bool(key)}), 200
    body = request.get_json(force=True, silent=True) or {}
    new_key = body.get('apiKey','').strip()
    settings['apiKey'] = new_key
    _save_settings(settings)
    if new_key:
        os.environ['GEMINI_API_KEY'] = new_key
    return jsonify({"message": "API key updated"}), 200

@app.route('/api/settings/theme', methods=['GET','POST'])
@token_required
def settings_theme():
    settings = _load_settings()
    if request.method == 'GET':
        return jsonify({"theme": settings.get('theme','dark')}), 200
    body = request.get_json(force=True, silent=True) or {}
    theme = body.get('theme','dark')
    if theme not in ['dark','light']:
        return api_err("Invalid theme", 400)
    settings['theme'] = theme
    _save_settings(settings)
    return jsonify({"message": "Theme updated", "theme": theme}), 200

# Notifications feature removed per request


# --- Error Handlers ---
@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Not Found", "message": "The requested URL was not found on the server."}), 404

@app.errorhandler(500)
def internal_server_error(error):
    return jsonify({"error": "Internal Server Error", "message": "An unexpected error occurred."}), 500

# --- MAIN EXECUTION ---
if __name__ == '__main__':
    # Use environment variables for production deployment
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)
