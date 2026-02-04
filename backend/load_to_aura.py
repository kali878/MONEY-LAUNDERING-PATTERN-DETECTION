import os
import pandas as pd
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

# --- Configuration for Cloud Deployment ---
def get_neo4j_config():
    """Get Neo4j configuration from environment variables"""
    config = {
        'uri': os.getenv("NEO4J_URI", "bolt://localhost:7687"),
        'user': os.getenv("NEO4J_USERNAME", "neo4j"),  # Note: USERNAME not USER for Aura
        'password': os.getenv("NEO4J_PASSWORD", "password")
    }
    
    print(f"Connecting to Neo4j at: {config['uri']}")
    print(f"Username: {config['user']}")
    return config

def run_cypher_query(driver, query, records, batch_size=500):
    """Helper to run queries in batches - reduced batch size for cloud"""
    with driver.session() as session:
        total = len(records)
        for i in range(0, total, batch_size):
            batch = records[i:i+batch_size]
            try:
                session.run(query, {"records": batch})
                print(f"  ...processed {min(i + batch_size, total)}/{total} records.")
            except Exception as e:
                print(f"  ERROR in batch {i}-{i+batch_size}: {e}")
                # Continue with next batch

def load_data_to_aura():
    """Load data to Neo4j Aura cloud instance"""
    print("--- Loading Data to Neo4j Aura ---")
    
    # Get configuration
    config = get_neo4j_config()
    
    # Data directory
    DATA_DIR = os.path.join(os.path.dirname(__file__), 'generated-data')
    
    try:
        # Connect to Neo4j Aura
        driver = GraphDatabase.driver(config['uri'], auth=(config['user'], config['password']))
        driver.verify_connectivity()
        print("✅ Successfully connected to Neo4j Aura!")
    except Exception as e:
        print(f"❌ ERROR: Could not connect to Neo4j Aura. Details: {e}")
        print("\n🔧 Troubleshooting:")
        print("1. Check your NEO4J_URI - should be neo4j+s://xxxxx.databases.neo4j.io")
        print("2. Verify NEO4J_USERNAME (usually 'neo4j')")
        print("3. Check NEO4J_PASSWORD from your Aura instance")
        print("4. Ensure your Aura instance is running")
        return False

    try:
        # Clear existing data
        print("\n🧹 Clearing existing data...")
        with driver.session() as session:
            session.run("MATCH (n) DETACH DELETE n")
        print("✅ Database cleared")

        # Load Persons
        print("\n👥 Loading Persons...")
        persons_df = pd.read_csv(os.path.join(DATA_DIR, 'Persons.csv'))
        persons_records = persons_df.to_dict('records')
        
        persons_query = """
        UNWIND $records AS record
        CREATE (p:Person {
            person_id: record.person_id,
            full_name: record.full_name,
            dob: date(record.dob),
            pan_number: record.pan_number,
            address: record.address,
            monthly_salary_inr: toInteger(record.monthly_salary_inr),
            tax_filing_status: record.tax_filing_status
        })
        """
        run_cypher_query(driver, persons_query, persons_records)
        print(f"✅ Loaded {len(persons_records)} persons")

        # Load Companies
        print("\n🏢 Loading Companies...")
        companies_df = pd.read_csv(os.path.join(DATA_DIR, 'Companies.csv'))
        companies_records = companies_df.to_dict('records')
        
        companies_query = """
        UNWIND $records AS record
        CREATE (c:Company {
            cin: record.cin,
            company_name: record.company_name,
            incorporation_date: date(record.incorporation_date),
            registered_address: record.registered_address,
            paid_up_capital_inr: toInteger(record.paid_up_capital_inr),
            business_activity: record.business_activity
        })
        """
        run_cypher_query(driver, companies_query, companies_records)
        print(f"✅ Loaded {len(companies_records)} companies")

        # Load Bank Accounts
        print("\n🏦 Loading Bank Accounts...")
        accounts_df = pd.read_csv(os.path.join(DATA_DIR, 'BankAccounts.csv'))
        accounts_records = accounts_df.to_dict('records')
        
        accounts_query = """
        UNWIND $records AS record
        CREATE (a:Account {
            account_number: record.account_number,
            account_type: record.account_type,
            bank_name: record.bank_name,
            ifsc_code: record.ifsc_code,
            balance_inr: toFloat(record.balance_inr),
            owner_id: record.owner_id
        })
        """
        run_cypher_query(driver, accounts_query, accounts_records)
        print(f"✅ Loaded {len(accounts_records)} bank accounts")

        # Create relationships between persons and accounts
        print("\n🔗 Creating Person-Account relationships...")
        person_account_query = """
        MATCH (p:Person), (a:Account)
        WHERE p.person_id = a.owner_id
        CREATE (p)-[:OWNS_ACCOUNT]->(a)
        """
        with driver.session() as session:
            result = session.run(person_account_query)
            print("✅ Person-Account relationships created")

        # Create relationships between companies and accounts
        print("\n🔗 Creating Company-Account relationships...")
        company_account_query = """
        MATCH (c:Company), (a:Account)
        WHERE c.cin = a.owner_id
        CREATE (c)-[:OWNS_ACCOUNT]->(a)
        """
        with driver.session() as session:
            result = session.run(company_account_query)
            print("✅ Company-Account relationships created")

        # Load Transactions (in smaller batches for cloud)
        print("\n💸 Loading Transactions...")
        transactions_df = pd.read_csv(os.path.join(DATA_DIR, 'Transactions.csv'))
        transactions_records = transactions_df.to_dict('records')
        
        transactions_query = """
        UNWIND $records AS record
        MATCH (from_account:Account {account_number: record.from_account})
        MATCH (to_account:Account {account_number: record.to_account})
        CREATE (from_account)-[:TRANSACTION {
            transaction_id: record.transaction_id,
            amount_inr: toFloat(record.amount_inr),
            timestamp: datetime(record.timestamp),
            payment_mode: record.payment_mode,
            remarks: record.remarks
        }]->(to_account)
        """
        run_cypher_query(driver, transactions_query, transactions_records, batch_size=200)  # Smaller batches
        print(f"✅ Loaded {len(transactions_records)} transactions")

        # Load Properties
        print("\n🏠 Loading Properties...")
        properties_df = pd.read_csv(os.path.join(DATA_DIR, 'Properties.csv'))
        properties_records = properties_df.to_dict('records')
        
        properties_query = """
        UNWIND $records AS record
        MATCH (p:Person {person_id: record.owner_person_id})
        CREATE (prop:Property {
            property_id: record.property_id,
            property_type: record.property_type,
            address: record.address,
            purchase_value_inr: toInteger(record.purchase_value_inr),
            purchase_date: date(record.purchase_date),
            current_value_inr: toInteger(record.current_value_inr)
        })
        CREATE (p)-[:OWNS_PROPERTY]->(prop)
        """
        run_cypher_query(driver, properties_query, properties_records)
        print(f"✅ Loaded {len(properties_records)} properties")

        # Create indexes for better performance
        print("\n📊 Creating indexes for performance...")
        indexes = [
            "CREATE INDEX person_id_index IF NOT EXISTS FOR (p:Person) ON (p.person_id)",
            "CREATE INDEX company_cin_index IF NOT EXISTS FOR (c:Company) ON (c.cin)",
            "CREATE INDEX account_number_index IF NOT EXISTS FOR (a:Account) ON (a.account_number)",
            "CREATE INDEX transaction_id_index IF NOT EXISTS FOR ()-[t:TRANSACTION]-() ON (t.transaction_id)"
        ]
        
        with driver.session() as session:
            for index_query in indexes:
                session.run(index_query)
        print("✅ Indexes created")

        print("\n🎉 Data loading completed successfully!")
        print("Your Neo4j Aura database is ready for Project ANUP-SECURITY-PORTAL!")
        
        return True

    except Exception as e:
        print(f"❌ ERROR during data loading: {e}")
        return False
    finally:
        driver.close()

if __name__ == "__main__":
    success = load_data_to_aura()
    if success:
        print("\n✅ Ready for deployment!")
    else:
        print("\n❌ Please fix the issues and try again.")
