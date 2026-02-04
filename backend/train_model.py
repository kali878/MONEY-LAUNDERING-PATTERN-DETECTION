import os
import pandas as pd
from sklearn.ensemble import IsolationForest
import joblib

# --- Configuration ---
# Define the relative paths to the data and model directories.
# This makes the script runnable from the `backend` directory.
DATA_DIR = os.path.join(os.path.dirname(__file__), 'generated-data')
TRANSACTIONS_FILE = os.path.join(DATA_DIR, 'Transactions.csv')
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')
MODEL_PATH = os.path.join(MODEL_DIR, 'isolation_forest.pkl')

def train_model():
    """
    Loads transaction data, trains an Isolation Forest model for anomaly detection,
    and saves the trained model to a file.
    """
    print("--- Starting Model Training ---")

    # 1. Load the dataset
    try:
        print(f"Loading data from {TRANSACTIONS_FILE}...")
        df = pd.read_csv(TRANSACTIONS_FILE)
        print("Data loaded successfully.")
    except FileNotFoundError:
        print(f"ERROR: Transactions.csv not found at {TRANSACTIONS_FILE}")
        print("Please run the data generation script first.")
        return



    # 2. Feature Engineering
    print("Performing feature engineering...")
    # Convert timestamp to a numerical feature (epoch time) for the model
    # FIX IS HERE: Added the format parameter to handle microseconds
    df['timestamp'] = pd.to_datetime(df['timestamp'], format='mixed')
    df['timestamp_epoch'] = df['timestamp'].astype('int64') // 10**9


    # Select features for the model
    # We choose features that are likely to indicate anomalous behavior
    features = [
        'amount_inr',
        'timestamp_epoch'
    ]
    X = df[features]

    print(f"Training on {len(X)} transactions with features: {features}")

    # 3. Train the Isolation Forest Model
    # The 'contamination' parameter is the expected proportion of outliers in the data.
    # We'll assume around 1% of transactions are anomalous for this model.
    print("Training Isolation Forest model...")
    model = IsolationForest(
        n_estimators=100,
        contamination=0.01,
        max_samples='auto',
        random_state=42
    )
    model.fit(X)
    print("Model training complete.")

    # 4. Save the Model
    # Ensure the 'models' directory exists
    os.makedirs(MODEL_DIR, exist_ok=True)
    
    print(f"Saving model to {MODEL_PATH}...")
    joblib.dump(model, MODEL_PATH)
    print("--- Model saved successfully! ---")
    print(f"The backend is now ready. You can run 'flask run' to start the server.")

if __name__ == "__main__":
    train_model()
