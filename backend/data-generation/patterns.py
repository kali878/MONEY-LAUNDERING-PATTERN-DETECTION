import numpy as np
import pandas as pd
from faker import Faker
from datetime import timedelta

# Initialize Faker for generating realistic data
fake = Faker('en_IN')

def create_structuring_pattern(transactions_list, accounts_df):
    """
    Injects a 'structuring' (or smurfing) pattern into the transaction list.
    This involves breaking a large sum into multiple smaller transactions to avoid
    detection thresholds (e.g., staying under the 50,000 INR limit).

    Args:
        transactions_list (list): The existing list of transaction dictionaries.
        accounts_df (pd.DataFrame): DataFrame containing all bank accounts.

    Returns:
        list: The updated list of transaction dictionaries with the new pattern.
    """
    account_numbers = accounts_df['account_number'].tolist()
    if len(account_numbers) < 2:
        return transactions_list # Not enough accounts to create a pattern

    # 1. Select two accounts for the pattern
    source_acc, target_acc = np.random.choice(account_numbers, 2, replace=False)
    
    # 2. Define the large amount to be laundered and break it down
    total_amount = np.random.randint(400000, 900000) # e.g., 7 Lakhs
    num_transactions = np.random.randint(10, 20) # Break into 10-20 smaller chunks
    
    base_amount = total_amount // num_transactions
    
    # 3. Generate the series of small transactions
    start_time = fake.date_time_between(start_date='-1y', end_date='-1w')
    
    for i in range(num_transactions):
        # Make amounts slightly variable to look more realistic, keeping them under 50k
        transaction_amount = base_amount + np.random.randint(-2000, 2000)
        transaction_amount = min(transaction_amount, 49999)

        # Stagger transactions over a few days
        transaction_time = start_time + timedelta(hours=np.random.randint(1, 72), minutes=np.random.randint(1, 60))
        
        new_transaction = {
            'transaction_id': f"TXN-S{len(transactions_list)+1:06d}",
            'from_account': source_acc,
            'to_account': target_acc,
            'amount_inr': transaction_amount,
            'timestamp': transaction_time,
            'payment_mode': np.random.choice(['Cash Deposit', 'IMPS', 'UPI']),
            'remarks': 'Structuring Pattern Deposit'
        }
        transactions_list.append(new_transaction)
        
    return transactions_list


def create_shell_company_layering_pattern(transactions_list, accounts_df, companies_df):
    """
    Injects a 'layering' pattern using a shell company.
    Multiple sources send money to a shell company, which then funnels the
    consolidated amount to a single beneficiary.

    Args:
        transactions_list (list): The existing list of transaction dictionaries.
        accounts_df (pd.DataFrame): DataFrame of all bank accounts.
        companies_df (pd.DataFrame): DataFrame of all companies.

    Returns:
        list: Updated list of transactions with the layering pattern.
    """
    # 1. Identify a plausible shell company (new, low capital)
    potential_shells = companies_df[
        (companies_df['paid_up_capital_inr'] < 500000) &
        (pd.to_datetime(companies_df['incorporation_date']) > (pd.Timestamp.now() - pd.DateOffset(months=12)))
    ]
    if potential_shells.empty:
        return transactions_list # No suitable shell companies found

    shell_cin = potential_shells.sample(1)['cin'].iloc[0]
    shell_account = accounts_df[accounts_df['owner_id'] == shell_cin]['account_number'].sample(1).iloc[0]

    # 2. Select multiple source accounts and a single beneficiary account
    num_sources = np.random.randint(4, 8)
    all_person_accounts = accounts_df[accounts_df['account_type'] == 'Savings']['account_number']
    
    if len(all_person_accounts) < num_sources + 1:
        return transactions_list

    source_accounts = np.random.choice(all_person_accounts, num_sources, replace=False)
    beneficiary_account = np.random.choice(all_person_accounts, 1, replace=False)[0]

    # 3. Generate the layering transactions
    total_layered_amount = 0
    start_time = fake.date_time_between(start_date='-6m', end_date='-1w')

    # Phase 1: Funnel money into the shell company
    for source_acc in source_accounts:
        amount = np.random.randint(500000, 2000000) # Large, round-figure amounts
        total_layered_amount += amount
        
        transaction_time = start_time + timedelta(hours=np.random.randint(1, 24))

        new_transaction = {
            'transaction_id': f"TXN-L-IN{len(transactions_list)+1:05d}",
            'from_account': source_acc,
            'to_account': shell_account,
            'amount_inr': amount,
            'timestamp': transaction_time,
            'payment_mode': 'RTGS',
            'remarks': 'Layering Input to Shell'
        }
        transactions_list.append(new_transaction)

    # Phase 2: Funnel the consolidated amount out to the beneficiary
    # Add a slight delay for realism
    payout_time = start_time + timedelta(days=np.random.randint(1, 3))
    payout_transaction = {
        'transaction_id': f"TXN-L-OUT{len(transactions_list)+1:04d}",
        'from_account': shell_account,
        'to_account': beneficiary_account,
        'amount_inr': int(total_layered_amount * np.random.uniform(0.95, 0.99)), # Simulate a small fee/cut
        'timestamp': payout_time,
        'payment_mode': 'RTGS',
        'remarks': 'Layering Payout from Shell'
    }
    transactions_list.append(payout_transaction)

    return transactions_list


def create_mule_account_pattern(transactions_list, accounts_df, mule_candidates_df):
    """
    Injects a 'mule account' pattern.
    A low-income individual's account is used to receive multiple small deposits
    which are then quickly consolidated and transferred out.

    Args:
        transactions_list (list): The existing list of transaction dictionaries.
        accounts_df (pd.DataFrame): DataFrame of all bank accounts.
        mule_candidates_df (pd.DataFrame): DataFrame of low-income individuals.

    Returns:
        list: Updated list of transactions with the mule account pattern.
    """
    if mule_candidates_df.empty:
        return transactions_list
    
    # 1. Select a mule and their account
    mule_person_id = mule_candidates_df.sample(1)['person_id'].iloc[0]
    mule_accounts = accounts_df[accounts_df['owner_id'] == mule_person_id]
    if mule_accounts.empty:
        return transactions_list
    mule_account = mule_accounts['account_number'].iloc[0]

    # 2. Select source accounts and a beneficiary
    num_sources = np.random.randint(5, 10)
    all_person_accounts = accounts_df[accounts_df['account_type'] == 'Savings']['account_number']
    
    if len(all_person_accounts) < num_sources + 1:
        return transactions_list
        
    source_accounts = np.random.choice(all_person_accounts.drop(mule_accounts.index, errors='ignore'), num_sources, replace=False)
    beneficiary_account = np.random.choice(all_person_accounts.drop(mule_accounts.index, errors='ignore'), 1, replace=False)[0]

    # 3. Generate mule transactions
    total_mule_amount = 0
    start_time = fake.date_time_between(start_date='-3m', end_date='-1w')

    # Phase 1: Multiple small, unrelated deposits into the mule account
    for source_acc in source_accounts:
        amount = np.random.randint(20000, 48000)
        total_mule_amount += amount
        transaction_time = start_time + timedelta(hours=np.random.randint(1, 48))

        new_transaction = {
            'transaction_id': f"TXN-M-IN{len(transactions_list)+1:05d}",
            'from_account': source_acc,
            'to_account': mule_account,
            'amount_inr': amount,
            'timestamp': transaction_time,
            'payment_mode': np.random.choice(['UPI', 'IMPS']),
            'remarks': 'Mule Activity - Deposit'
        }
        transactions_list.append(new_transaction)
    
    # Phase 2: A single, large transfer out of the mule account
    payout_time = start_time + timedelta(days=np.random.randint(3, 5))
    payout_transaction = {
        'transaction_id': f"TXN-M-OUT{len(transactions_list)+1:04d}",
        'from_account': mule_account,
        'to_account': beneficiary_account,
        'amount_inr': int(total_mule_amount * np.random.uniform(0.98, 0.99)), # Mule keeps a small cut
        'timestamp': payout_time,
        'payment_mode': 'NEFT',
        'remarks': 'Mule Activity - Payout'
    }
    transactions_list.append(payout_transaction)
    
    return transactions_list
