import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# Increment this whenever scoring logic changes materially
SCORING_VERSION = 2

class HybridRiskScorer:
    """
    A service to analyze financial data, calculate risk scores for individuals
    based on money laundering patterns, and provide detailed investigation data.
    """
    def __init__(self, all_datasets):
        """
        Initializes the service with all pre-loaded dataframes.
        """
        # Assign dataframes from the input dictionary
        self.persons_df = all_datasets['persons']
        self.accounts_df = all_datasets['accounts']
        self.transactions_df = all_datasets['transactions']
        self.companies_df = all_datasets['companies']
        self.properties_df = all_datasets['properties']
        self.directorships_df = all_datasets['directorships']
        
        # Initialize the risk_scores_df attribute to None.
        # It will be populated when run_full_analysis is called.
        self.risk_scores_df = None
        
        # Preprocess the data to prepare it for analysis
        self._preprocess_data()

    def _preprocess_data(self):
        """
        Prepares and merges dataframes for efficient analysis.
        """
        self.transactions_df['timestamp'] = pd.to_datetime(self.transactions_df['timestamp'], format='mixed')
        self.companies_df['incorporation_date'] = pd.to_datetime(self.companies_df['incorporation_date'])
        
        # Standardize person identifier columns across all relevant dataframes
        temp_accounts_df = self.accounts_df.rename(columns={'owner_id': 'person_id'})
        self.properties_df = self.properties_df.rename(columns={'owner_person_id': 'person_id'})

        self.person_accounts_df = temp_accounts_df[~temp_accounts_df['person_id'].str.startswith('C')]
        self.company_accounts_df = temp_accounts_df[temp_accounts_df['person_id'].str.startswith('C')]
        
        # Merge transactions with person details for scoring
        self.tx_details_df = self.transactions_df.merge(
            self.person_accounts_df[['account_number', 'person_id']],
            left_on='from_account', right_on='account_number', how='left'
        ).rename(columns={'person_id': 'from_person_id'})
        
        self.tx_details_df = self.tx_details_df.merge(
            self.person_accounts_df[['account_number', 'person_id']],
            left_on='to_account', right_on='account_number', how='left'
        ).rename(columns={'person_id': 'to_person_id'})

        self.tx_details_df = self.tx_details_df.merge(
            self.persons_df[['person_id', 'monthly_salary_inr']],
            left_on='from_person_id', right_on='person_id', how='left'
        ).rename(columns={'monthly_salary_inr': 'from_person_salary'})
        
        self.tx_details_df = self.tx_details_df.merge(
            self.persons_df[['person_id', 'monthly_salary_inr']],
            left_on='to_person_id', right_on='person_id', how='left'
        ).rename(columns={'monthly_salary_inr': 'to_person_salary'})

    def run_full_analysis(self):
        """Execute all risk scoring rules for all persons and persist alert list."""
        all_scores: list[dict] = []

        threshold = int(os.environ.get('RISK_ALERT_THRESHOLD', '10'))

        for _, person in self.persons_df.iterrows():
            person_id = person['person_id']

            scores = {
                'income_discrepancy': self._calculate_income_discrepancy_score(person_id),
                'structuring': self._calculate_structuring_score(person_id),
                'shell_company_interaction': self._calculate_shell_company_score(person_id),
                'property_discrepancy': self._calculate_property_discrepancy_score(person_id),
                'tax_status': self._calculate_tax_status_score(person_id),
            }

            weights = {
                'income_discrepancy': 0.30,
                'structuring': 0.25,
                'shell_company_interaction': 0.25,
                'property_discrepancy': 0.15,
                'tax_status': 0.05,
            }

            final_score = sum(scores[k] * weights[k] for k in scores)

            if final_score > threshold:
                all_scores.append({
                    'alert_id': f"ALT-{len(all_scores)+1:03d}",
                    'person_id': person_id,
                    'full_name': person['full_name'],
                    'final_risk_score': int(final_score),
                    'risk_score': int(final_score),  # compatibility
                    'timestamp': pd.Timestamp.now().isoformat(),
                    'summary': self._generate_summary(scores),
                    'status': 'active',
                    'scoring_version': SCORING_VERSION,
                })

        self.risk_scores_df = (
            pd.DataFrame(all_scores)
            .sort_values(by='final_risk_score', ascending=False)
            .reset_index(drop=True)
        ) if all_scores else pd.DataFrame(columns=[
            'alert_id','person_id','full_name','final_risk_score','risk_score','timestamp','summary','status','scoring_version'
        ])

        output_path = os.path.join(os.path.dirname(__file__), '..', 'generated-data', 'AlertScores.csv')
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        self.risk_scores_df.to_csv(output_path, index=False)
        print(f"Saved {len(self.risk_scores_df)} alerts to {output_path}")

        return self.risk_scores_df.to_dict(orient='records')

    def get_person_risk_details(self, person_id):
        """
        Retrieves detailed risk breakdown for a single person. Used for the Triage page.
        """
        person_details = self.persons_df[self.persons_df['person_id'] == person_id]
        if person_details.empty:
            return None
        
        # Recalculate individual scores for the breakdown
        scores = {
            'income_discrepancy': self._calculate_income_discrepancy_score(person_id),
            'structuring': self._calculate_structuring_score(person_id),
            'shell_company_interaction': self._calculate_shell_company_score(person_id),
            'property_discrepancy': self._calculate_property_discrepancy_score(person_id),
            'tax_status': self._calculate_tax_status_score(person_id),
        }
        
        weights = {
            'income_discrepancy': 0.30, 'structuring': 0.25,
            'shell_company_interaction': 0.25, 'property_discrepancy': 0.15,
            'tax_status': 0.05,
        }
        
        recalculated_score = sum(scores[key] * weights[key] for key in scores)

        # Load current alert score (canonical) if exists; update version mismatch
        canonical_alert_score = None
        alerts_path = os.path.join(os.path.dirname(__file__), '..', 'generated-data', 'AlertScores.csv')
        try:
            if (self.risk_scores_df is not None) and not self.risk_scores_df.empty:
                row = self.risk_scores_df[self.risk_scores_df['person_id'] == person_id]
                if not row.empty:
                    canonical_alert_score = int(row.iloc[0]['final_risk_score'])
            elif os.path.exists(alerts_path):
                cached_df = pd.read_csv(alerts_path)
                row = cached_df[cached_df['person_id'] == person_id]
                if not row.empty:
                    canonical_alert_score = int(row.iloc[0]['final_risk_score'])
        except Exception as e:
            print(f"WARN: Could not retrieve canonical alert score for {person_id}: {e}")

        # Decide final score: prefer canonical alert score if present to match UI lists
        final_score = int(canonical_alert_score) if canonical_alert_score is not None else int(recalculated_score)

        # If we have a canonical alert but scoring version bumped and difference large (>10), refresh the alert entry in memory
        if canonical_alert_score is not None and abs(canonical_alert_score - recalculated_score) > 10:
            try:
                # Update in dataframe and persist
                if (self.risk_scores_df is not None) and not self.risk_scores_df.empty:
                    idx = self.risk_scores_df[self.risk_scores_df['person_id'] == person_id].index
                    if len(idx) == 1:
                        self.risk_scores_df.loc[idx, 'final_risk_score'] = int(recalculated_score)
                        self.risk_scores_df.loc[idx, 'risk_score'] = int(recalculated_score)
                        self.risk_scores_df.loc[idx, 'scoring_version'] = SCORING_VERSION
                        self.risk_scores_df.to_csv(alerts_path, index=False)
                        final_score = int(recalculated_score)
            except Exception as e:
                print(f"WARN: Failed to harmonize alert score for {person_id}: {e}")

        return {
            "person_id": person_id,
            "final_risk_score": final_score,
            "recalculated_risk_score": int(recalculated_score),
            "canonical_alert_score": canonical_alert_score,
            "scoring_version": SCORING_VERSION,
            "person_details": person_details.iloc[0].to_dict(),
            "breakdown": {
                'income': {'label': 'Income vs. Transactions', 'score': scores['income_discrepancy']},
                'structuring': {'label': 'Transaction Structuring', 'score': scores['structuring']},
                'shell': {'label': 'Shell Company Links', 'score': scores['shell_company_interaction']},
                'property': {'label': 'High-Value Property', 'score': scores['property_discrepancy']},
                'tax': {'label': 'Tax Status Irregularities', 'score': scores['tax_status']},
            }
        }
    
    def search_persons(self, query):
        """
        Searches for persons by name or person_id.
        """
        if not query: return []
        query = query.lower()
        results_df = self.persons_df[
            self.persons_df['full_name'].str.lower().str.contains(query) |
            self.persons_df['person_id'].str.lower().str.contains(query)
        ]
        return results_df.head(20).to_dict(orient='records')

    # --- Scoring Helper Methods ---

    def _generate_summary(self, scores):
        triggered = [key for key, value in scores.items() if value > 0]
        if not triggered: return "Low Risk Profile"
        
        summary_map = {
            'income_discrepancy': "high-value credits inconsistent with salary",
            'structuring': "structuring patterns (multiple cash deposits)",
            'shell_company_interaction': "transactions with suspected shell companies",
            'property_discrepancy': "high-value property ownership",
            'tax_status': "tax filing irregularities"
        }
        
        top_reason = max(triggered, key=lambda reason: scores[reason])
        summary_text = f"Risk flagged due to {summary_map[top_reason]}"
        if len(triggered) > 1:
            summary_text += f" and {len(triggered)-1} other factors."
        return summary_text

    def _calculate_income_discrepancy_score(self, person_id):
        person_salary = self.persons_df.loc[self.persons_df['person_id'] == person_id, 'monthly_salary_inr'].iloc[0]
        if person_salary <= 0:
            return 0
        person_transactions = self.tx_details_df[self.tx_details_df['to_person_id'] == person_id]
        # Credits exceeding 2x salary considered anomalous; scale by count
        high_value_credits = person_transactions[person_transactions['amount_inr'] > (person_salary * 2)]
        count = len(high_value_credits)
        if count == 0:
            return 0
        # Each anomalous credit adds 20 points up to 100
        return min(100, count * 20)

    def _calculate_structuring_score(self, person_id):
        person_accounts = self.person_accounts_df[self.person_accounts_df['person_id'] == person_id]['account_number'].tolist()
        if not person_accounts: return 0
        cash_deposits = self.transactions_df[
            (self.transactions_df['to_account'].isin(person_accounts)) &
            (self.transactions_df['payment_mode'] == 'Cash') &
            (self.transactions_df['amount_inr'].between(40000, 49999))
        ]
        n = len(cash_deposits)
        if n == 0:
            return 0
        if n >= 8:
            return 100
        if n >= 5:
            return 70
        if n >= 3:
            return 40
        return 15  # at least some low-level structuring pattern

    def _calculate_shell_company_score(self, person_id):
        person_accounts = self.person_accounts_df[self.person_accounts_df['person_id'] == person_id]['account_number'].tolist()
        if not person_accounts: return 0
        
        potential_shells = self.companies_df[
            (self.companies_df['incorporation_date'] > datetime.now() - timedelta(days=365)) &
            (self.companies_df['paid_up_capital_inr'] < 500000)
        ]['cin'].tolist()
        if not potential_shells: return 0
        
        shell_accounts = self.company_accounts_df[self.company_accounts_df['person_id'].isin(potential_shells)]['account_number'].tolist()
        risky_tx = self.transactions_df[
            (self.transactions_df['from_account'].isin(person_accounts) & self.transactions_df['to_account'].isin(shell_accounts)) |
            (self.transactions_df['to_account'].isin(person_accounts) & self.transactions_df['from_account'].isin(shell_accounts))
        ]
        n = len(risky_tx)
        if n == 0:
            return 0
        if n >= 10:
            return 100
        if n >= 5:
            return 70
        if n >= 2:
            return 40
        return 20

    def _calculate_property_discrepancy_score(self, person_id):
        person_salary = self.persons_df.loc[self.persons_df['person_id'] == person_id, 'monthly_salary_inr'].iloc[0]
        # Use the now-standardized 'person_id' column
        person_properties = self.properties_df[self.properties_df['person_id'] == person_id]
        if person_properties.empty: return 0
        
        total_property_value = person_properties['purchase_value_inr'].sum()
        if person_salary <= 0:
            return 0
        # Ratio of total property value to 12 * salary (annual) baseline *10 (approx wealth multiple)
        ratio = total_property_value / (person_salary * 12) if person_salary > 0 else 0
        if ratio <= 5:
            return 0
        if ratio >= 50:
            return 100
        # Scale between 5x and 50x linearly
        scaled = int(((ratio - 5) / (50 - 5)) * 100)
        return max(10, min(100, scaled))

    def _calculate_tax_status_score(self, person_id):
        tax_status = self.persons_df.loc[self.persons_df['person_id'] == person_id, 'tax_filing_status'].iloc[0]
        return 80 if tax_status == 'Not Filed' else 0

