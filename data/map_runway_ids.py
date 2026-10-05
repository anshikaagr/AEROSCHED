import pandas as pd

file_path = "data/processed/egll_runway_events_july2026.parquet"

df = pd.read_parquet(file_path)

# Treat "nan" as missing
df["runway"] = df["runway"].replace("nan", pd.NA)

print("========== RUNWAY ID → RUNWAY NAME ==========")

mapping = (
    df.dropna(subset=["runway"])
      .groupby(["runway_id", "runway"])
      .size()
      .reset_index(name="events")
      .sort_values("events", ascending=False)
)

print(mapping.to_string(index=False))

print("\n========== ALL RUNWAY IDs ==========")

all_ids = (
    df.groupby(["runway_id", "runway"], dropna=False)
      .size()
      .reset_index(name="events")
      .sort_values("events", ascending=False)
)

print(all_ids.to_string(index=False))