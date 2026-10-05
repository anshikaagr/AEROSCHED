import pandas as pd
from pathlib import Path

raw_path = Path("data/raw")

event_files = sorted(raw_path.glob("*.parquet"))

print("Event files found:")
for file in event_files:
    print(" -", file.name)

print("\n========== FIRST EVENT FILE ==========")

file_path = event_files[0]
df = pd.read_parquet(file_path)

print("File:", file_path.name)
print("Rows:", df.shape[0])
print("Columns:", df.shape[1])

print("\nColumn names:")
print(df.columns.tolist())

print("\nFirst 5 rows:")
print(df.head().to_string())

print("\nData types:")
print(df.dtypes)

print("\n========== EVENT TYPES ==========")
print(df["type"].value_counts())