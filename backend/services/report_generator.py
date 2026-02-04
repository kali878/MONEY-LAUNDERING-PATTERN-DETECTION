import os
import logging
import pandas as pd
from fpdf import FPDF
from datetime import datetime

class ReportGenerator:
    """
    Generates a comprehensive PDF intelligence report for a specific individual.
    """
    def __init__(self, all_datasets):
        """
        Initializes the report generator with pre-loaded pandas DataFrames.
        """
        self.persons_df = all_datasets.get('persons')
        self.properties_df = all_datasets.get('properties')
        # Optional metadata provided by DataLoader (seed/snapshot/counts)
        self.metadata = all_datasets.get('metadata') if isinstance(all_datasets, dict) else None
        # Guard against missing dataset
        if self.properties_df is None:
            logging.getLogger(__name__).warning("properties dataset missing; proceeding with empty DataFrame for reports.")
            import pandas as _pd
            self.properties_df = _pd.DataFrame(columns=['person_id','property_address','purchase_value_inr'])
        elif 'owner_person_id' in self.properties_df.columns:
            self.properties_df = self.properties_df.rename(columns={'owner_person_id': 'person_id'})

    def _safe_text(self, text):
        """
        Encodes text to be safely used in FPDF, handling potential special characters.
        """
        if text is None:
            return "N/A"
        # Convert to string and handle encoding more safely
        text_str = str(text)
        # Remove problematic characters that might cause layout issues
        text_str = text_str.replace('\r\n', ' ').replace('\n', ' ').replace('\r', ' ')
        # Handle encoding with better fallback
        try:
            return text_str.encode('latin-1', 'replace').decode('latin-1')
        except:
            # If encoding fails, return ASCII-only version
            return ''.join(char if ord(char) < 128 else '?' for char in text_str)

    def generate_pdf(self, person_id, risk_details, summary, *, allow_fallback=True):
        """
        Generates and saves a PDF report for a given person_id using pre-analyzed data.
        """
        try:
            person_info = self.persons_df[self.persons_df['person_id'] == person_id]
            if person_info.empty:
                print(f"Error: Person with ID {person_id} not found for report generation.")
                return None
            person_info = person_info.iloc[0]
            
            # Create PDF with explicit settings to avoid layout issues
            pdf = FPDF(orientation='P', unit='mm', format='A4')
            # Set margins BEFORE adding the first page (fpdf2 quirk for width calc)
            left_margin = 15
            right_margin = 15
            top_margin = 15
            pdf.set_margins(left_margin, top_margin, right_margin)
            pdf.set_auto_page_break(auto=True, margin=18)
            pdf.add_page()

            content_width = pdf.w - pdf.l_margin - pdf.r_margin

            def safe_mc(txt, h=6, font=None, style='', size=0):
                """Safe multi_cell wrapper that avoids width=0 issues."""
                if font:
                    pdf.set_font(font, style, size or pdf.font_size_pt)
                try:
                    pdf.multi_cell(content_width, h, self._safe_text(txt), 0, 'L')
                except Exception as mc_err:
                    # Last resort: truncate the text and write with cell
                    trunc = self._safe_text(str(txt))[:120]
                    pdf.cell(content_width, h, trunc, 0, 1, 'L')
                    logging.getLogger(__name__).warning(f"safe_mc fallback used ({mc_err}). Text truncated.")
            
            # Debug info
            logging.getLogger(__name__).debug(
                f"PDF content width: {content_width}mm (page width {pdf.w} minus margins {pdf.l_margin}+{pdf.r_margin})"
            )
            
            # --- Header (use core PDF font 'Helvetica' to avoid undefined font errors) ---
            pdf.set_font("Helvetica", 'B', 18)
            pdf.ln(6)
            # Centered header using cell with explicit width
            pdf.cell(0, 10, "Project Anup-Security-Portal - Intelligence Report", 0, 1, 'C')
            pdf.ln(10)

            # --- Case Summary ---
            pdf.set_font("Helvetica", 'B', 14)
            subject_name = person_info.get('full_name', 'N/A')
            safe_mc(f"Subject: {subject_name} (ID: {person_id})", h=8)
            
            pdf.set_font("Helvetica", '', 12)
            gen_ts = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            # Metadata: basic counts to aid traceability
            factors_count = len((risk_details or {}).get('breakdown', {}) or {})
            props_count = int(self.properties_df[self.properties_df['person_id'] == person_id].shape[0])
            safe_mc(f"Generated on: {gen_ts}", h=6)
            safe_mc(f"Rows: risk_factors={factors_count}, properties={props_count}", h=6)
            # Include dataset seed/snapshot if available
            try:
                if self.metadata:
                    seed = self.metadata.get('seed')
                    snapshot = self.metadata.get('snapshot')
                    if seed is not None:
                        safe_mc(f"Dataset seed: {seed}", h=6)
                    if snapshot:
                        safe_mc(f"Dataset snapshot: {snapshot}", h=6)
            except Exception:
                pass
            pdf.ln(5)
            
            # --- Risk Score ---
            pdf.set_font("Helvetica", 'B', 12)
            safe_mc("Overall Risk Score:", h=8)
            pdf.set_text_color(255, 0, 0)
            final_score = risk_details.get('final_risk_score', 0)
            pdf.set_font("Helvetica", 'B', 16)
            safe_mc(str(int(final_score)), h=10, style='B', size=16)
            pdf.set_text_color(0, 0, 0)
            pdf.ln(10)

            # --- AI Generated Summary ---
            self._add_section_title(pdf, "AI Generated Summary")
            pdf.set_font("Helvetica", '', 11)
            summary_text = summary or "No AI summary available."
            # Limit summary length to prevent issues
            if len(summary_text) > 800:
                summary_text = summary_text[:800] + "..."
            safe_mc(summary_text, h=6)
            pdf.ln(10)

            # --- Risk Factors Breakdown (Tabular) ---
            self._add_section_title(pdf, "Risk Factor Analysis")
            breakdown = risk_details.get('breakdown', {}) or {}
            if breakdown:
                # Build normalized list including zero scores, alphabetically by label
                factors = []
                for k, v in breakdown.items():
                    factors.append({
                        'label': v.get('label', k),
                        'score': int(v.get('score', 0))
                    })
                factors.sort(key=lambda x: x['label'].lower())
                # Table header
                pdf.set_font("Helvetica", 'B', 11)
                col_w_label = int(content_width * 0.70)
                col_w_score = content_width - col_w_label
                pdf.set_fill_color(240,240,240)
                pdf.cell(col_w_label, 8, 'Factor', 0, 0, 'L', fill=True)
                pdf.cell(col_w_score, 8, 'Score', 0, 1, 'C', fill=True)
                pdf.set_font("Helvetica", '', 10)
                for f in factors:
                    # Light grey background for non-zero
                    if f['score'] > 0:
                        pdf.set_fill_color(255, 250, 240)
                        fill=True
                    else:
                        pdf.set_fill_color(255, 255, 255)
                        fill=False
                    label_txt = self._safe_text(f["label"])[:60]
                    pdf.cell(col_w_label, 6, label_txt, 0, 0, 'L', fill=fill)
                    # Color score if > 0
                    if f['score'] > 0:
                        pdf.set_text_color(200,0,0)
                    pdf.cell(col_w_score, 6, str(f['score']), 0, 1, 'C', fill=fill)
                    if f['score'] > 0:
                        pdf.set_text_color(0,0,0)
                pdf.ln(6)
            else:
                pdf.set_font("Helvetica", 'I', 11)
                safe_mc("No risk breakdown available.")
                pdf.ln(4)

            # --- Subject Details (two-column key/value) ---
            self._add_section_title(pdf, "Subject Details")
            pdf.set_font("Helvetica", '', 10)
            salary = person_info.get('monthly_salary_inr', 0)
            salary_text = f"INR {int(salary):,}/month" if pd.notna(salary) and salary > 0 else "N/A"
            details_pairs = [
                ("Full Name", person_info.get('full_name', 'N/A')),
                ("Date of Birth", person_info.get('dob', 'N/A')),
                ("PAN Number", person_info.get('pan_number', 'N/A')),
                ("Declared Salary", salary_text),
                ("Address", person_info.get('address', 'N/A')),
            ]
            key_w = int(content_width * 0.35)
            val_w = content_width - key_w
            for k,v in details_pairs:
                pdf.set_font("Helvetica", 'B', 10)
                pdf.cell(key_w, 6, self._safe_text(k)+":", 0, 0, 'L')
                pdf.set_font("Helvetica", '', 10)
                # Wrap value manually if long
                start_x = pdf.get_x(); start_y = pdf.get_y()
                txt = self._safe_text(str(v))
                if len(txt) <= 70:
                    pdf.multi_cell(val_w, 6, txt, 0, 'L')
                else:
                    # chunk
                    remaining = txt
                    first = True
                    while remaining:
                        line = remaining[:70]
                        remaining = remaining[70:]
                        pdf.multi_cell(val_w, 6, line, 0, 'L')
                        if remaining:
                            pdf.set_x(pdf.l_margin + key_w)
                pdf.ln(0)
            pdf.ln(6)

            # --- Associated Properties (tabular) ---
            self._add_section_title(pdf, "Associated Properties")
            person_properties = self.properties_df[self.properties_df['person_id'] == person_id]
            if not person_properties.empty:
                pdf.set_font("Helvetica", 'B', 10)
                addr_w = int(content_width * 0.70)
                val_w = content_width - addr_w
                pdf.set_fill_color(240,240,240)
                pdf.cell(addr_w, 7, 'Address', 0, 0, 'L', fill=True)
                pdf.cell(val_w, 7, 'Value (INR)', 0, 1, 'C', fill=True)
                pdf.set_font("Helvetica", '', 9)
                for _, prop in person_properties.iterrows():
                    address = str(prop.get('property_address','N/A'))
                    if len(address) > 65:
                        address = address[:62] + '...'
                    pv = prop.get('purchase_value_inr', 0)
                    pv_text = f"{int(pv):,}" if pd.notna(pv) and pv > 0 else 'N/A'
                    pdf.cell(addr_w, 6, self._safe_text(address), 0, 0, 'L')
                    pdf.cell(val_w, 6, pv_text, 0, 1, 'C')
                pdf.ln(4)
            else:
                pdf.set_font("Helvetica", 'I', 10)
                safe_mc("No properties recorded.")
                pdf.ln(2)

            # --- Compliance Notes ---
            self._add_section_title(pdf, "Compliance Notes")
            pdf.set_font("Helvetica", '', 9)
            disclaimer = (
                "This report is generated from synthetic / analytical data for investigative support. "
                "Risk scores are heuristic and should be corroborated with additional KYC, transactional, and documentary evidence before any enforcement action."
            )
            safe_mc(disclaimer, h=5)
            pdf.ln(4)

            # --- Footer ---
            pdf.set_y(-25)
            pdf.set_font("Helvetica", 'I', 8)
            pdf.cell(0, 10, f'Page {pdf.page_no()}', 0, 1, 'C')

            # --- Save the PDF ---
            output_dir = os.path.join(os.path.dirname(__file__), '..', 'reports')
            os.makedirs(output_dir, exist_ok=True)
            file_path = os.path.join(output_dir, f"report_{person_id}.pdf")
            pdf.output(file_path)
            logging.getLogger(__name__).info(f"Successfully generated report: {file_path}")
            return file_path

        except Exception as e:
            import traceback
            logging.getLogger(__name__).error(f"FATAL ERROR during primary PDF generation for {person_id}: {e}")
            logging.getLogger(__name__).error(f"TRACE: {traceback.format_exc()}")
            if not allow_fallback:
                return None
            # --- Fallback minimal PDF attempt ---
            try:
                logging.getLogger(__name__).warning(f"Attempting fallback minimal PDF for {person_id}...")
                pdf = FPDF()
                pdf.set_margins(15, 15, 15)
                pdf.add_page()
                cw = pdf.w - pdf.l_margin - pdf.r_margin
                pdf.set_font("Helvetica", 'B', 16)
                pdf.multi_cell(cw, 8, f"Investigation Report (Fallback)")
                pdf.ln(2)
                pdf.set_font("Helvetica", '', 12)
                pdf.multi_cell(cw, 6, f"Subject: {person_id}")
                pdf.set_font("Helvetica", '', 11)
                pdf.multi_cell(cw, 6, "Full report generation failed. This minimal PDF was generated as a fallback.")
                if risk_details:
                    pdf.multi_cell(cw, 6, f"Risk Score: {risk_details.get('final_risk_score', 'N/A')}")
                if summary:
                    pdf.multi_cell(cw, 6, f"Summary: {self._safe_text(summary)[:300]}")
                output_dir = os.path.join(os.path.dirname(__file__), '..', 'reports')
                os.makedirs(output_dir, exist_ok=True)
                file_path = os.path.join(output_dir, f"report_{person_id}_fallback.pdf")
                pdf.output(file_path)
                logging.getLogger(__name__).info(f"Fallback PDF generated: {file_path}")
                return file_path
            except Exception as fe:
                logging.getLogger(__name__).error(f"FATAL: Fallback PDF generation also failed for {person_id}: {fe}")
                return None

    def _add_section_title(self, pdf, title):
        """Adds a section title with consistent formatting."""
        pdf.set_font("Helvetica", 'B', 14)
        pdf.set_fill_color(230, 230, 230)
        pdf.multi_cell(0, 10, self._safe_text(title), 0, 'L', fill=True)
        pdf.ln(5)