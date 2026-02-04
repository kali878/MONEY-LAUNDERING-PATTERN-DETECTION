import pandas as pd
import os
import logging

class DataLoader:
    """Load CSV datasets and optional metadata.json with light schema validation.

    Attributes:
        data_path: Base directory containing generated CSVs and optional metadata.json.
        datasets: In-memory cache of loaded DataFrames keyed by dataset name.
        file_names: Mapping of dataset keys to CSV filenames.
        schemas: Minimal required columns per dataset for fail-fast validation.
        metadata_file: Path to metadata.json (if present).
        metadata: Parsed metadata contents.
    """
    def __init__(self, data_path='./generated-data/'):
        self.data_path = data_path
        self.datasets = {}
        self.file_names = {
            "persons": "Persons.csv",
            "accounts": "BankAccounts.csv",
            "transactions": "Transactions.csv",
            "companies": "Companies.csv",
            "directorships": "Directorships.csv",
            "properties": "Properties.csv",
            "cases": "PoliceCases.csv",
            "alerts": "AlertScores.csv"
        }
        # Minimal schema contracts (column presence); types are validated loosely
        self.schemas = {
            "persons": ["person_id","full_name", "sex","email","dob","pan_number","address","monthly_salary_inr","tax_filing_status"],
            "accounts": ["account_number","owner_id","bank_name","account_type","open_date","balance_inr"],
            "transactions": ["transaction_id","from_account","to_account","amount_inr","timestamp","payment_mode","remarks"],
            "companies": ["cin","company_name","registered_address","incorporation_date","company_status","paid_up_capital_inr"],
            "directorships": ["directorship_id","person_id","cin","appointment_date"],
            "properties": ["property_id","owner_person_id","property_address","purchase_date","purchase_value_inr"],
            "cases": ["case_id","person_id","case_details","case_date","status"],
            "alerts": ["alert_id","person_id","risk_score","timestamp","summary","status"],
        }
        self.logger = logging.getLogger(__name__)
        # Metadata path and in-memory cache
        self.metadata_file = os.path.join(self.data_path, 'metadata.json')
        self.metadata = None

    def _validate_schema(self, key: str, df: pd.DataFrame):
        required = self.schemas.get(key)
        if not required:
            return
        missing = [c for c in required if c not in df.columns]
        if missing:
            raise ValueError(f"{key} missing columns: {', '.join(missing)}")
        # Light type checks for numeric-ish fields
        numeric_hints = [
            ("persons", ["monthly_salary_inr"]),
            ("accounts", ["balance_inr"]),
            ("companies", ["paid_up_capital_inr"]),
            ("transactions", ["amount_inr"]),
            ("properties", ["purchase_value_inr"]),
            ("alerts", ["risk_score"]),
        ]
        for dataset, cols in numeric_hints:
            if dataset != key:
                continue
            for col in cols:
                if col in df.columns:
                    try:
                        pd.to_numeric(df[col])
                    except Exception:
                        raise ValueError(f"{key}.{col} contains non-numeric values")

    def load_all_data(self):
        self.logger.info("--- Starting Data Loading Process ---")
        for key, file_name in self.file_names.items():
            full_path = os.path.join(self.data_path, file_name)
            try:
                df = pd.read_csv(full_path)
                # Validate schema and types
                self._validate_schema(key, df)
                self.datasets[key] = df
                self.logger.info(f"[SUCCESS] Loaded '{file_name}' into memory.")
            except FileNotFoundError:
                self.logger.error(f"File not found: '{full_path}'. Cannot load '{key}' dataset.")
                self.datasets[key] = None
            except ValueError as ve:
                # Fail fast with concise message
                msg = f"[SCHEMA ERROR] {ve}. File: '{file_name}'"
                self.logger.error(msg)
                # Re-raise to stop startup if core schemas are broken
                raise
            except Exception as e:
                self.logger.error(f"Failed reading '{file_name}': {e}")
                self.datasets[key] = None
        self.logger.info("--- Data Loading Process Finished ---")
        # Load metadata if present
        try:
            if os.path.exists(self.metadata_file):
                import json
                with open(self.metadata_file, 'r', encoding='utf-8') as f:
                    self.metadata = json.load(f)
                # Light schema validation (non-fatal)
                valid_meta, warn_msg = self._validate_metadata(self.metadata)
                if not valid_meta and warn_msg:
                    self.logger.warning(f"metadata.json validation: {warn_msg}")
                self.logger.info("[INFO] Loaded metadata.json")
        except Exception as me:
            self.logger.warning(f"Failed to read metadata.json: {me}")
        return self.datasets

    def get_metadata(self):
        # Derive counts if metadata missing
        meta = self.metadata or {}
        counts = meta.get('counts') or {}
        for k, df in self.datasets.items():
            if df is not None and hasattr(df, 'shape'):
                counts[k] = int(df.shape[0])
        if counts:
            meta['counts'] = counts
        return meta or {"counts": counts}

    def get_data(self, key):
        return self.datasets.get(key)

    # --- helpers ---
    def _validate_metadata(self, meta: dict):
        """Return (is_valid, warning_message). Non-fatal; get_metadata() can derive counts.
        Expected shape:
          {
            "seed": int|str,
            "snapshot": str (ISO8601),
            "counts": { str: int }
          }
        """
        try:
            if not isinstance(meta, dict):
                return False, "metadata root is not an object"
            # counts optional but if present must be a dict of ints
            if 'counts' in meta:
                if not isinstance(meta['counts'], dict):
                    return False, "counts should be an object"
                for k, v in meta['counts'].items():
                    if not isinstance(k, str) or not isinstance(v, (int, float)):
                        return False, "counts should map string->number"
            # seed can be str or int
            if 'seed' in meta and not isinstance(meta['seed'], (int, str)):
                return False, "seed should be string or number"
            # snapshot should be string if present
            if 'snapshot' in meta and not isinstance(meta['snapshot'], str):
                return False, "snapshot should be a string"
            return True, None
        except Exception as e:
            return False, str(e)

if __name__ == '__main__':
    logging.basicConfig(level=os.getenv('LOG_LEVEL', 'INFO').upper(), format='[%(levelname)s] %(message)s')
    logger = logging.getLogger(__name__)
    logger.info("Running DataLoader in standalone mode for testing...")

    loader = DataLoader(data_path='./generated-data/')
    all_data = loader.load_all_data()

    logger.info("\n--- Verifying Loaded Data ---")
    all_loaded = True
    for name, df in all_data.items():
        if df is not None:
            logger.info(f"Dataset '{name}': {df.shape[0]} rows, {df.shape[1]} columns. Preview:")
            logger.info("\n%s\n%s", df.head(2), "-" * 30)
        else:
            all_loaded = False
            logger.warning(f"Dataset '{name}': FAILED TO LOAD.")

    if not all_loaded:
        logger.warning("Some datasets failed to load. Ensure 'backend/data-generation/generate_data.py' has been run.")
    else:
        logger.info("All datasets loaded successfully.")
