import os
import time
import logging
from typing import Iterable, Dict, Any, Optional

import pandas as pd
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

# --- Logging ---
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger("neo4j_loader")

# --- Configuration ---
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", os.getenv("NEO4J_USERNAME", "neo4j"))
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")
NEO4J_DB = os.getenv("NEO4J_DB", "neo4j")
NEO4J_RESET = os.getenv("NEO4J_RESET", "false").lower() == "true"
NEO4J_BATCH_SIZE = int(os.getenv("NEO4J_BATCH_SIZE", "1000"))
CSV_CHUNK_SIZE = int(os.getenv("NEO4J_CSV_CHUNK", "10000"))

DATA_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', 'generated-data'))

def _write_tx(tx, query: str, batch: Iterable[Dict[str, Any]]):
    return tx.run(query, {"records": list(batch)})


def _execute_write(session, query: str, batch: Iterable[Dict[str, Any]]):
    # Support both neo4j >=5 (execute_write) and <5 (write_transaction)
    if hasattr(session, "execute_write"):
        return session.execute_write(_write_tx, query, batch)
    else:
        return session.write_transaction(_write_tx, query, batch)


def run_cypher_query(driver, query: str, records: Iterable[Dict[str, Any]], *, batch_size: int, stage: str, database: Optional[str] = None):
    """Run a cypher with batched writes and log counters and timing."""
    start = time.time()
    total = 0
    with driver.session(database=database) as session:
        records_list = list(records)
        for i in range(0, len(records_list), batch_size):
            batch = records_list[i:i + batch_size]
            result = _execute_write(session, query, batch)
            try:
                summary = result.consume()
                counters = summary.counters
                logger.info(f"{stage}: batch {i//batch_size+1} -> nodes created={counters.nodes_created}, relationships created={counters.relationships_created}, properties set~="
                            f"{counters.properties_set if hasattr(counters,'properties_set') else 'n/a'}")
            except Exception:
                logger.info(f"{stage}: batch {i//batch_size+1} processed {len(batch)} records")
            total += len(batch)
    logger.info(f"{stage}: processed {total} records in {time.time()-start:.2f}s")

def _create_constraints(driver):
    """Create uniqueness constraints if not present; support Neo4j 5 and 4 syntax."""
    stmts_v5 = [
        "CREATE CONSTRAINT person_id IF NOT EXISTS FOR (p:Person) REQUIRE p.person_id IS UNIQUE",
        "CREATE CONSTRAINT company_cin IF NOT EXISTS FOR (c:Company) REQUIRE c.cin IS UNIQUE",
        "CREATE CONSTRAINT account_number IF NOT EXISTS FOR (b:BankAccount) REQUIRE b.account_number IS UNIQUE",
    ]
    stmts_v4 = [
        "CREATE CONSTRAINT person_id IF NOT EXISTS ON (p:Person) ASSERT p.person_id IS UNIQUE",
        "CREATE CONSTRAINT company_cin IF NOT EXISTS ON (c:Company) ASSERT c.cin IS UNIQUE",
        "CREATE CONSTRAINT account_number IF NOT EXISTS ON (b:BankAccount) ASSERT b.account_number IS UNIQUE",
    ]
    with driver.session(database=NEO4J_DB) as session:
        for stmt in stmts_v5:
            try:
                session.run(stmt)
            except Exception:
                # Try v4 syntax fallback for this constraint
                idx = stmts_v5.index(stmt)
                try:
                    session.run(stmts_v4[idx])
                except Exception as e:
                    logger.warning(f"Constraint creation failed: {e}")


def main():
    logger.info("--- Starting Neo4j Data Loading Script ---")
    
    # Validate env quickly
    if not NEO4J_URI or not NEO4J_USER or not NEO4J_PASSWORD:
        logger.error("NEO4J_URI/NEO4J_USER/NEO4J_PASSWORD must be set.")
        return

    try:
        driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
        driver.verify_connectivity()
        logger.info("Successfully connected to Neo4j.")
    except Exception as e:
        logger.error(f"ERROR: Could not connect to Neo4j. Aborting. Details: {e}")
        return

    # 1. Constraints
    logger.info("\n[STEP 1/6] Ensuring constraints exist...")
    _create_constraints(driver)
    logger.info("  Constraints created or already exist.")

    # Optional: destructive wipe (gated)
    if NEO4J_RESET:
        logger.warning("\n[RESET] NEO4J_RESET=true -> Clearing existing database (MATCH (n) DETACH DELETE n)...")
        with driver.session(database=NEO4J_DB) as session:
            session.run("MATCH (n) DETACH DELETE n")
        logger.info("  Database cleared.")

    # 2. Load Persons
    logger.info("\n[STEP 2/6] Loading Persons (idempotent MERGE)...")
    persons_path = os.path.join(DATA_DIR, 'Persons.csv')
    if os.path.exists(persons_path):
        for chunk in pd.read_csv(persons_path, chunksize=CSV_CHUNK_SIZE):
            records = chunk.to_dict('records')
            query = """
            UNWIND $records AS record
            MERGE (p:Person { person_id: record.person_id })
            ON CREATE SET p.full_name = record.full_name,
                          p.dob = record.dob,
                          p.pan_number = record.pan_number,
                          p.address = record.address,
                          p.monthly_salary_inr = record.monthly_salary_inr,
                          p.tax_filing_status = record.tax_filing_status
            ON MATCH SET  p.full_name = record.full_name,
                          p.dob = record.dob,
                          p.pan_number = record.pan_number,
                          p.address = record.address,
                          p.monthly_salary_inr = record.monthly_salary_inr,
                          p.tax_filing_status = record.tax_filing_status
            """
            run_cypher_query(driver, query, records, batch_size=NEO4J_BATCH_SIZE, stage="Persons", database=NEO4J_DB)
    else:
        logger.warning(f"Persons file not found at {persons_path}")

    # 3. Load Companies
    logger.info("\n[STEP 3/6] Loading Companies (idempotent MERGE)...")
    companies_path = os.path.join(DATA_DIR, 'Companies.csv')
    if os.path.exists(companies_path):
        for chunk in pd.read_csv(companies_path, chunksize=CSV_CHUNK_SIZE):
            records = chunk.to_dict('records')
            query = """
            UNWIND $records AS record
            MERGE (c:Company { cin: record.cin })
            ON CREATE SET c.company_name = record.company_name,
                          c.incorporation_date = record.incorporation_date,
                          c.paid_up_capital_inr = record.paid_up_capital_inr
            ON MATCH SET  c.company_name = record.company_name,
                          c.incorporation_date = record.incorporation_date,
                          c.paid_up_capital_inr = record.paid_up_capital_inr
            """
            run_cypher_query(driver, query, records, batch_size=NEO4J_BATCH_SIZE, stage="Companies", database=NEO4J_DB)
    else:
        logger.warning(f"Companies file not found at {companies_path}")
    
    # 4. Load Bank Accounts and ownership relationships
    logger.info("\n[STEP 4/6] Loading Bank Accounts and ownership relationships (idempotent MERGE)...")
    accounts_path = os.path.join(DATA_DIR, 'BankAccounts.csv')
    if os.path.exists(accounts_path):
        for chunk in pd.read_csv(accounts_path, chunksize=CSV_CHUNK_SIZE):
            records = chunk.to_dict('records')
            query_nodes = """
            UNWIND $records AS r
            MERGE (b:BankAccount {account_number: r.account_number})
            """
            run_cypher_query(driver, query_nodes, records, batch_size=NEO4J_BATCH_SIZE, stage="BankAccounts", database=NEO4J_DB)

            query_rels = """
            UNWIND $records AS r
            MATCH (b:BankAccount {account_number: r.account_number})
            OPTIONAL MATCH (p:Person {person_id: r.owner_id})
            OPTIONAL MATCH (c:Company {cin: r.owner_id})
            FOREACH (_ IN CASE WHEN p IS NOT NULL THEN [1] ELSE [] END | MERGE (p)-[:OWNS_ACCOUNT]->(b))
            FOREACH (_ IN CASE WHEN c IS NOT NULL THEN [1] ELSE [] END | MERGE (c)-[:OWNS_ACCOUNT]->(b))
            """
            run_cypher_query(driver, query_rels, records, batch_size=NEO4J_BATCH_SIZE, stage="AccountOwnership", database=NEO4J_DB)
    else:
        logger.warning(f"BankAccounts file not found at {accounts_path}")

    # 5. Load Transactions
    logger.info("\n[STEP 5/6] Loading Transactions (idempotent MERGE + hardened timestamps)...")
    tx_path = os.path.join(DATA_DIR, 'Transactions.csv')
    if os.path.exists(tx_path):
        for chunk in pd.read_csv(tx_path, chunksize=CSV_CHUNK_SIZE):
            # Harden timestamps
            ts = pd.to_datetime(chunk['timestamp'], errors='coerce', utc=True)
            # Where valid, format iso; else fallback replacing space with 'T'
            formatted = ts.dt.strftime('%Y-%m-%dT%H:%M:%SZ')
            fallback = chunk['timestamp'].astype(str).str.replace(' ', 'T', regex=False)
            chunk['timestamp'] = formatted.where(ts.notna(), fallback)

            records = chunk.to_dict('records')
            query = """
            UNWIND $records AS r
            MATCH (from_acc:BankAccount {account_number: r.from_account})
            MATCH (to_acc:BankAccount {account_number: r.to_account})
            MERGE (from_acc)-[t:TRANSACTION { transaction_id: r.transaction_id }]->(to_acc)
            ON CREATE SET t.amount_inr = r.amount_inr,
                          t.timestamp = datetime(r.timestamp),
                          t.payment_mode = r.payment_mode
            ON MATCH SET  t.amount_inr = r.amount_inr,
                          t.timestamp = datetime(r.timestamp),
                          t.payment_mode = r.payment_mode
            """
            run_cypher_query(driver, query, records, batch_size=NEO4J_BATCH_SIZE, stage="Transactions", database=NEO4J_DB)
    else:
        logger.warning(f"Transactions file not found at {tx_path}")

    logger.info("\n[STEP 6/6] Done.")

    driver.close()
    logger.info("\n--- Neo4j Data Loading Complete! ---")

if __name__ == "__main__":
    main()

