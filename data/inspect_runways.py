import pandas as pd

file_path = "data/raw/runways.csv"

df = pd.read_csv(file_path)

print("========== RUNWAY DATASET INFO ==========")
print("Rows:", len(df))
print("Columns:", len(df.columns))

print("\n========== COLUMN NAMES ==========")
print(df.columns.tolist())

print("\n========== FIRST 10 ROWS ==========")
print(df.head(10).to_string())

print("\n========== DATA TYPES ==========")
print(df.dtypes)

print("\n========== EGLL RUNWAYS ==========")
egll = df[df["airport_ident"] == "EGLL"]

print(egll.to_string(index=False))

print("\n========== TARGET RUNWAY IDS ==========")

target_ids = [1252338026, 510279300]

print(
    df[df["id"].isin(target_ids)][
        ["id", "airport_ident", "le_ident", "he_ident", "length_ft", "width_ft", "surface", "closed"]
    ].to_string(index=False)
)