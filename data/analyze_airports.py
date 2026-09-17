import pandas as pd

file_path = "data/raw/flight_list_202607.parquet"

df = pd.read_parquet(file_path)

print("Top 20 departure airports:")
print(df["adep"].value_counts().head(20))

print("\nTop 20 destination airports:")
print(df["ades"].value_counts().head(20))