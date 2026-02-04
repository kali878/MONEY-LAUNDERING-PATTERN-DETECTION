import os
import random
import logging
import pandas as pd
from faker import Faker
import numpy as np
from datetime import datetime, timedelta

# Import the pattern generation functions from our patterns.py file
from patterns import (
    create_structuring_pattern,
    create_shell_company_layering_pattern,
    create_mule_account_pattern
)

# --- Configuration ---
NUM_PERSONS = 1000
NUM_COMPANIES = 200
NUM_TRANSACTIONS_NORMAL = 20000
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'generated-data')

# Initialize Faker for Indian data with deterministic seeding
fake = Faker('en_IN')

logger = logging.getLogger(__name__)

# Deterministic seeding via env var
def _init_seed():
    env_seed = os.getenv('DATA_SEED') or os.getenv('SEED')
    if env_seed is not None:
        try:
            seed = int(env_seed)
        except ValueError:
            # Derive an int from string hash consistently
            seed = abs(hash(env_seed)) % (2**32)
    else:
        # Generate a random seed if none provided
        seed = int.from_bytes(os.urandom(4), 'big')
    # Apply seeds
    Faker.seed(seed)
    fake.seed_instance(seed)
    np.random.seed(seed)
    random.seed(seed)
    logger.info(f"[DATA-GEN] Using deterministic seed: {seed}")
    return seed

def generate_persons_data(num_persons):
    """Generates synthetic data for individuals."""
    persons = []
    for i in range(1, num_persons + 1):
        person_id = f"PER{i:05d}"
        salary = np.random.choice(
            [35000, 45000, 50000, 65000, 80000, 120000, 200000, 0],
            p=[0.2, 0.2, 0.2, 0.15, 0.1, 0.05, 0.05, 0.05] # Some unemployed
        )
        persons.append({
            'person_id': person_id,
            'full_name': fake.name(),
            'dob': fake.date_of_birth(minimum_age=18, maximum_age=70),
            'pan_number': fake.unique.bothify(text='?????####?').upper(),
            'address': fake.address().replace('\n', ', '),
            'monthly_salary_inr': salary,
            'tax_filing_status': np.random.choice(['Filed', 'Not Filed', 'Pending'], p=[0.7, 0.2, 0.1])
        })
    return pd.DataFrame(persons)

def generate_companies_data(num_companies):
    """Generates synthetic data for companies, including some potential shells."""
    companies = []
    for i in range(1, num_companies + 1):
        incorporation_date = fake.date_between(start_date='-10y', end_date='-1d')
        is_shell = np.random.rand() < 0.15 # 15% are potential shells
        
        paid_up_capital = np.random.randint(100000, 500000) if is_shell else np.random.randint(500000, 10000000)
        company_status = "Active"
        if is_shell and np.random.rand() < 0.3:
            incorporation_date = fake.date_between(start_date='-8m', end_date='-1d') # Shells are often new

        companies.append({
            'cin': f"CIN{i:05d}",
            'company_name': fake.company() + " " + fake.company_suffix(),
            'registered_address': fake.address().replace('\n', ', '),
            'incorporation_date': incorporation_date,
            'company_status': company_status,
            'paid_up_capital_inr': paid_up_capital
        })
    return pd.DataFrame(companies)

def generate_bank_accounts_data(persons_df, companies_df):
    """Generates bank accounts linked to persons and companies."""
    accounts = []
    account_number_start = 1001001000
    
    # Each person gets 1-2 accounts
    for _, person in persons_df.iterrows():
        for _ in range(np.random.randint(1, 3)):
            accounts.append({
                'account_number': str(account_number_start),
                'owner_id': person['person_id'],
                'bank_name': np.random.choice(['HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank', 'Kotak Mahindra Bank']),
                'account_type': 'Savings',
                'open_date': fake.date_between(start_date='-15y', end_date='-1d'),
                'balance_inr': max(0, int(person['monthly_salary_inr'] * np.random.uniform(0.5, 5.0)))
            })
            account_number_start += 1
            
    # Each company gets 1-3 accounts
    for _, company in companies_df.iterrows():
        for _ in range(np.random.randint(1, 4)):
            accounts.append({
                'account_number': str(account_number_start),
                'owner_id': company['cin'],
                'bank_name': np.random.choice(['HDFC Bank', 'ICICI Bank', 'Yes Bank', 'IDFC First Bank']),
                'account_type': 'Current',
                'open_date': company['incorporation_date'],
                 'balance_inr': int(company['paid_up_capital_inr'] * np.random.uniform(0.8, 10.0))
            })
            account_number_start += 1
            
    return pd.DataFrame(accounts)

def generate_directorships_data(persons_df, companies_df):
    """Links persons as directors to companies."""
    directorships = []
    persons_sample = persons_df.sample(frac=0.5).person_id.tolist() # 50% of people are directors
    for cin in companies_df.cin:
        num_directors = np.random.randint(2, 6)
        directors = np.random.choice(persons_sample, num_directors, replace=False)
        for person_id in directors:
            directorships.append({
                'directorship_id': f"DIR{len(directorships)+1:05d}",
                'person_id': person_id,
                'cin': cin,
                'appointment_date': fake.date_between(start_date='-5y', end_date='-1d')
            })
    return pd.DataFrame(directorships)

def generate_properties_data(persons_df):
    """Generates property ownership data for individuals."""
    properties = []
    # 20% of people own discoverable property
    for _, person in persons_df.sample(frac=0.2).iterrows():
        purchase_value = int(person['monthly_salary_inr'] * 12 * np.random.uniform(1, 10))
        # Some have suspiciously high-value properties
        if np.random.rand() < 0.1:
             purchase_value = int(person['monthly_salary_inr'] * 12 * np.random.uniform(20, 50))
             if person['monthly_salary_inr'] == 0:
                 purchase_value = np.random.randint(5000000, 20000000)

        properties.append({
            'property_id': f"PROP{len(properties)+1:05d}",
            'owner_person_id': person['person_id'],
            'property_address': fake.address().replace('\n', ', '),
            'purchase_date': fake.date_between(start_date='-8y', end_date='-1d'),
            'purchase_value_inr': purchase_value
        })
    return pd.DataFrame(properties)

def generate_police_cases_data(persons_df):
    """Generates fake police case data for some individuals."""
    cases = []
    # 5% of people have a prior case
    for _, person in persons_df.sample(frac=0.05).iterrows():
        cases.append({
            'case_id': f"CASE{len(cases)+1:05d}",
            'person_id': person['person_id'],
            'case_details': np.random.choice(['Cheque Bounce', 'Fraud', 'Theft', 'Assault', 'Cybercrime']),
            'case_date': fake.date_between(start_date='-10y', end_date='-1d'),
            'status': np.random.choice(['Closed', 'Under Investigation', 'Convicted'])
        })
    return pd.DataFrame(cases)

def generate_normal_transactions(accounts_df, num_transactions):
    """Generates a baseline of normal, everyday transactions."""
    transactions = []
    account_numbers = accounts_df.account_number.tolist()
    
    for i in range(num_transactions):
        from_acc, to_acc = np.random.choice(account_numbers, 2, replace=False)
        amount = np.random.choice(
            [np.random.randint(100, 1000), np.random.randint(1000, 10000), np.random.randint(10000, 45000)],
            p=[0.4, 0.4, 0.2]
        )
        transactions.append({
            'transaction_id': f"TXN{i+1:07d}",
            'from_account': from_acc,
            'to_account': to_acc,
            'amount_inr': amount,
            'timestamp': fake.date_time_between(start_date='-2y', end_date='now'),
            'payment_mode': np.random.choice(['NEFT', 'IMPS', 'UPI', 'RTGS']),
            'remarks': 'Transaction'
        })
    return transactions

def generate_all_data():
    """Main function to generate all datasets and save them to CSV."""
    logger.info("--- Starting Synthetic Data Generation ---")
    seed = _init_seed()
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # 1. Generate Base Entities
    logger.info("Generating Persons...")
    persons_df = generate_persons_data(NUM_PERSONS)
    persons_df.to_csv(os.path.join(OUTPUT_DIR, 'Persons.csv'), index=False)
    
    logger.info("Generating Companies...")
    companies_df = generate_companies_data(NUM_COMPANIES)
    companies_df.to_csv(os.path.join(OUTPUT_DIR, 'Companies.csv'), index=False)

    # 2. Generate Relational Data
    logger.info("Generating Bank Accounts...")
    accounts_df = generate_bank_accounts_data(persons_df, companies_df)
    accounts_df.to_csv(os.path.join(OUTPUT_DIR, 'BankAccounts.csv'), index=False)
    
    logger.info("Generating Directorships...")
    directorships_df = generate_directorships_data(persons_df, companies_df)
    directorships_df.to_csv(os.path.join(OUTPUT_DIR, 'Directorships.csv'), index=False)

    logger.info("Generating Properties...")
    properties_df = generate_properties_data(persons_df)
    properties_df.to_csv(os.path.join(OUTPUT_DIR, 'Properties.csv'), index=False)
    
    logger.info("Generating Police Cases...")
    police_cases_df = generate_police_cases_data(persons_df)
    police_cases_df.to_csv(os.path.join(OUTPUT_DIR, 'PoliceCases.csv'), index=False)
    
    # 3. Generate Transactions with Embedded Patterns
    logger.info("Generating normal transactions baseline...")
    transactions = generate_normal_transactions(accounts_df, NUM_TRANSACTIONS_NORMAL)
    
    logger.info("Injecting money laundering patterns...")
    # Inject Structuring / Smurfing patterns
    for _ in range(5): # Create 5 instances of this pattern
        transactions = create_structuring_pattern(transactions, accounts_df)
    
    # Inject Shell Company Layering patterns
    for _ in range(3): # Create 3 instances of this pattern
       transactions = create_shell_company_layering_pattern(transactions, accounts_df, companies_df)

    # Inject Mule Account patterns
    mule_candidates = persons_df[persons_df['monthly_salary_inr'] <= 35000]
    for _ in range(4): # Create 4 instances of this pattern
        transactions = create_mule_account_pattern(transactions, accounts_df, mule_candidates)

    transactions_df = pd.DataFrame(transactions)
    logger.info(f"Total transactions generated: {len(transactions_df)}")
    transactions_df.to_csv(os.path.join(OUTPUT_DIR, 'Transactions.csv'), index=False)

    # Create an empty AlertScores.csv file as a placeholder for the backend
    pd.DataFrame(columns=['alert_id', 'person_id', 'risk_score', 'timestamp', 'summary', 'status']).to_csv(os.path.join(OUTPUT_DIR, 'AlertScores.csv'), index=False)
    
    # --- Persist metadata for determinism & auditability ---
    try:
        from datetime import datetime as _dt
        metadata = {
            "seed": int(seed),
            "snapshot": _dt.now().isoformat(timespec='seconds'),
            "counts": {
                "persons": int(persons_df.shape[0]),
                "companies": int(companies_df.shape[0]),
                "accounts": int(accounts_df.shape[0]),
                "directorships": int(directorships_df.shape[0]),
                "properties": int(properties_df.shape[0]),
                "cases": int(police_cases_df.shape[0]),
                "transactions": int(transactions_df.shape[0]),
                "alerts": 0
            }
        }
        import json as _json
        with open(os.path.join(OUTPUT_DIR, 'metadata.json'), 'w', encoding='utf-8') as f:
            _json.dump(metadata, f, indent=2)
        logger.info("[DATA-GEN] metadata.json written")
    except Exception as _e:
        logger.warning(f"Failed to write metadata.json: {_e}")
    
    logger.info("--- Data Generation Complete! ---")
    logger.info(f"All files have been saved to the '{OUTPUT_DIR}' directory.")


if __name__ == "__main__":
    logging.basicConfig(level=os.getenv('LOG_LEVEL', 'INFO').upper(), format='[%(levelname)s] %(message)s')
    generate_all_data()

