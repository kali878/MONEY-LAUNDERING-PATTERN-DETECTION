import os
import requests
import json
import logging
from typing import Dict, Any
from dotenv import load_dotenv

load_dotenv()

class AI_Summarizer:
    """
    Generates natural language summaries using the Gemini API.
    This class is initialized once and does not load any data itself.
    """
    def __init__(self):
        self._logger = logging.getLogger(__name__)
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            self._logger.warning("GEMINI_API_KEY not set; AI Summarizer will use fallback")
        
        # --- THIS IS THE FIX 1: Use the correct, modern model name ---
        self.api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key={self.api_key}"

    def generate_summary_from_details(self, risk_details: Dict[str, Any]) -> str:
        """
        Generates a summary from a dictionary of risk details for one person.
        """
        if not risk_details:
            return "No risk data available to summarize." 

        # Always build a deterministic fallback first (used if AI disabled / fails)
        fallback_summary = self._rule_based_fallback(risk_details)

        if not self.api_key:
            return fallback_summary + " (AI offline)"

        # --- Gather facts for the prompt from the provided dictionary ---
        try:
            facts = []
            person_info = risk_details.get('person_details', {})
            risk_breakdown = risk_details.get('breakdown', {})

            facts.append(f"Subject Name: {person_info.get('full_name', 'N/A')}")
            facts.append(f"Declared Monthly Salary: INR {person_info.get('monthly_salary_inr', 0):,}")
            facts.append(f"Assigned Risk Score: {risk_details.get('final_risk_score', 0)} out of 100")

            triggered_risks = [f"- {details['label']} (Score: {details['score']})" for _, details in risk_breakdown.items() if details['score'] > 0]
            if triggered_risks:
                facts.append("\nKey risk factors triggered:")
                facts.extend(triggered_risks)

        except Exception as e:
            self._logger.error(f"Error gathering facts for AI prompt: {e}")
            return "Error: Could not process the provided risk data to generate a summary."

        # --- Construct the prompt ---
        prompt_facts = "\n".join(facts)
        system_prompt = (
            "You are a world-class financial crimes analyst. Synthesize the following data points "
            "into a concise, professional, neutral-tone summary for an investigative case file. "
            "Do not use speculative language. Stick to the facts provided. Begin the summary directly."
        )
        user_prompt = f"Please generate a summary based on this case data:\n\n{prompt_facts}"

        # --- Call the Gemini API ---
        headers = {'Content-Type': 'application/json'}
        payload = {
            "contents": [{"parts": [{"text": user_prompt}]}],
            "systemInstruction": {"parts": [{"text": system_prompt}]}
        }

        try:
            response = requests.post(self.api_url, headers=headers, data=json.dumps(payload), timeout=15)
            response.raise_for_status()
            result = response.json()
            
            summary = result['candidates'][0]['content']['parts'][0]['text']
            return summary.strip()

        # --- THIS IS THE FIX 2: Graceful fallback on API failure ---
        except requests.exceptions.RequestException as e:
            self._logger.warning(f"AI API Request Error: {e}")
            return fallback_summary + " (AI request failed)"
        except (KeyError, IndexError) as e:
            self._logger.warning(f"AI API Parsing Error: {e}. Full Response: {response.text if 'response' in locals() else 'N/A'}")
            return fallback_summary + " (AI parse fallback)"

    def _rule_based_fallback(self, risk_details):
        """Generates a concise deterministic summary from risk details without external AI."""
        person = risk_details.get('person_details', {}) or {}
        name = person.get('full_name', 'Subject')
        pid = risk_details.get('person_id', 'Unknown')
        final_score = risk_details.get('final_risk_score', 0)
        breakdown = risk_details.get('breakdown', {}) or {}
        triggered = [d for d in breakdown.values() if d.get('score', 0) > 0]
        if not triggered and final_score == 0:
            return f"{name} (ID {pid}) currently exhibits no elevated risk indicators; all monitored factors score 0."
        factor_phrases = []
        for item in triggered:
            label = item.get('label', 'Unknown Factor')
            score = item.get('score', 0)
            if score >= 100:
                adjective = "significant" 
            elif score >= 50:
                adjective = "moderate"
            else:
                adjective = "minor"
            factor_phrases.append(f"{adjective} {label.lower()}")
        if factor_phrases:
            factors_text = ", ".join(factor_phrases[:-1]) + (" and " + factor_phrases[-1] if len(factor_phrases) > 1 else factor_phrases[0])
            return f"{name} (ID {pid}) has a composite risk score of {final_score}. Indicators include {factors_text}."
        else:
            return f"{name} (ID {pid}) has a composite risk score of {final_score} with no individual factor exceeding threshold." 
