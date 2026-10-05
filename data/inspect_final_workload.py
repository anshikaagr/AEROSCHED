import pandas as pd

file_path = "data/processed/egll_workload_july2026.parquet"

df = pd.read_parquet(file_path)

print("========== FINAL WORKLOAD INFO ==========")

print("Rows:", len(df))
print("Columns:", len(df.columns))

print("\n========== COLUMNS ==========")
print(df.columns.tolist())

print("\n========== DATA TYPES ==========")
print(df.dtypes)

print("\n========== FIRST 10 ROWS ==========")
print(df.head(10).to_string(index=False))

print("\n========== MISSING VALUES ==========")
print(df.isnull().sum())

print("\n========== OPERATIONS ==========")
print(df["operation"].value_counts())

print("\n========== RUNWAYS ==========")
print(df["runway"].value_counts())

print("\n========== OCCUPANCY ==========")
print(df["observed_occupancy_sec"].describe())