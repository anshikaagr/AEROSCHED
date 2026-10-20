#include <algorithm>
#include <cctype>
#include <ctime>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <limits>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>
#include <cmath>

using namespace std;

static constexpr long long AGEING_INTERVAL_SECONDS = 300;
static constexpr int AGEING_BONUS_PER_INTERVAL = 1;
static constexpr long long STARVATION_WARNING_SECONDS = 1800;


struct Flight {
    string flightId;
    string flightNumber;
    string operation;
    string aircraftType;
    string observedRunway;
    vector<string> eligibleRunways;
    long long requestTime = 0;
    int duration = 0;
    int priority = 0;
    int fuelScore = 0;
    int emergencyScore = 0;
    bool emergency = false;
};

static int effectivePriority(const Flight& f, long long waitSeconds) {
    const long long intervals =
        max(0LL, waitSeconds) / AGEING_INTERVAL_SECONDS;

    const long long bonus =
        intervals * AGEING_BONUS_PER_INTERVAL;

    // Aging continues beyond EFFECTIVE_PRIORITY_CAP.
    const long long effective =
        static_cast<long long>(f.priority) + bonus;

    return static_cast<int>(
        min(effective,
            static_cast<long long>(numeric_limits<int>::max())));
}

struct ScheduledFlight {
    Flight flight;
    string assignedRunway;
    long long startTime = 0;
    long long finishTime = 0;
    long long waitSeconds = 0;
};

struct Runway {
    string name;
    long long availableAt = 0;
};

struct CsvRow {
    vector<string> fields;
};

static string trim(const string& s) {
    size_t first = s.find_first_not_of(" \t\r\n");
    if (first == string::npos) return "";
    size_t last = s.find_last_not_of(" \t\r\n");
    return s.substr(first, last - first + 1);
}

static string lowerCopy(string s) {
    transform(s.begin(), s.end(), s.begin(),
              [](unsigned char c) { return static_cast<char>(tolower(c)); });
    return s;
}

static vector<string> parseCsvLine(const string& line) {
    vector<string> fields;
    string field;
    bool inQuotes = false;

    for (size_t i = 0; i < line.size(); ++i) {
        char c = line[i];

        if (c == '"') {
            if (inQuotes && i + 1 < line.size() && line[i + 1] == '"') {
                field += '"';
                ++i;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (c == ',' && !inQuotes) {
            fields.push_back(field);
            field.clear();
        } else {
            field += c;
        }
    }
    fields.push_back(field);
    return fields;
}

static long long parseTimestamp(const string& raw) {
    // Expected pandas timestamp format: YYYY-MM-DD HH:MM:SS[.fraction]
    string s = trim(raw);
    if (s.size() < 19) {
        throw runtime_error("Invalid timestamp: " + s);
    }

    tm t = {};
    istringstream input(s.substr(0, 19));
    input >> get_time(&t, "%Y-%m-%d %H:%M:%S");
    if (input.fail()) {
        throw runtime_error("Could not parse timestamp: " + s);
    }

    // Only timestamp differences matter. mktime interprets timestamps in local time;
    // all workload timestamps use the same timezone, so the differences remain valid.
    time_t epoch = mktime(&t);
    if (epoch == static_cast<time_t>(-1)) {
        throw runtime_error("Timestamp out of range: " + s);
    }
    return static_cast<long long>(epoch);
}

static int toInt(const string& s, int fallback = 0) {
    try {
        if (trim(s).empty()) return fallback;
        return stoi(s);
    } catch (...) {
        return fallback;
    }
}
static int toDurationSeconds(const string& s) {
    try {
        if (trim(s).empty()) return 1;

        double value = stod(trim(s));

        if (!isfinite(value) || value <= 0 || value > 2147483647.0) {
            throw runtime_error("Invalid occupancy duration: " + s);
        }

        return max(1, static_cast<int>(ceil(value)));
    } catch (const invalid_argument&) {
        throw runtime_error("Invalid occupancy duration: " + s);
    } catch (const out_of_range&) {
        throw runtime_error("Occupancy duration out of range: " + s);
    }
}
static bool toBool(const string& s) {
    string v = lowerCopy(trim(s));
    return v == "true" || v == "1" || v == "yes";
}

static string getField(const vector<string>& row,
                       const vector<string>& headers,
                       const string& name,
                       const string& fallback = "") {
    for (size_t i = 0; i < headers.size(); ++i) {
        if (trim(headers[i]) == name && i < row.size()) return trim(row[i]);
    }
    return fallback;
}

static vector<string> splitRunways(const string& value) {
    vector<string> result;
    string token;
    stringstream ss(value);
    while (getline(ss, token, ',')) {
        token = trim(token);
        if (!token.empty()) result.push_back(token);
    }
    return result;
}

static vector<Flight> loadFlights(const string& filename) {
    ifstream file(filename);
    if (!file) {
        throw runtime_error("Cannot open input CSV: " + filename);
    }

    string line;
    if (!getline(file, line)) throw runtime_error("Input CSV is empty.");

    vector<string> headers = parseCsvLine(line);
    vector<Flight> flights;
    long long earliestRequest = numeric_limits<long long>::max();

    while (getline(file, line)) {
        if (trim(line).empty()) continue;
        vector<string> row = parseCsvLine(line);

        Flight f;
        f.flightId = getField(row, headers, "flight_id");
        f.flightNumber = getField(row, headers, "flt_id", f.flightId);
        f.operation = getField(row, headers, "operation", "unknown");
        f.aircraftType = getField(row, headers, "aircraft_type", "Unknown");
        f.observedRunway = getField(row, headers, "observed_runway", "");
        f.duration = toDurationSeconds(
    getField(row, headers, "occupancy_sec", "1"));
        f.priority = toInt(getField(row, headers, "priority"), 0);
        f.fuelScore = toInt(getField(row, headers, "fuel_score"), 0);
        f.emergencyScore = toInt(getField(row, headers, "emergency_score"), 0);
        f.emergency = toBool(getField(row, headers, "emergency", "false"));

        string eligible = getField(row, headers, "eligible_runways");
        f.eligibleRunways = splitRunways(eligible);
        if (f.eligibleRunways.empty()) {
            // Fallback to observed runway if eligibility wasn't supplied.
            if (!f.observedRunway.empty()) f.eligibleRunways.push_back(f.observedRunway);
        }

        string request = getField(row, headers, "request_time");
        if (request.empty()) {
            throw runtime_error("CSV is missing a request_time value for flight " + f.flightId);
        }
        f.requestTime = parseTimestamp(request);
        earliestRequest = min(earliestRequest, f.requestTime);

        if (f.flightId.empty()) {
            f.flightId = f.flightNumber.empty()
                ? ("flight_" + to_string(flights.size() + 1))
                : f.flightNumber;
        }
        if (f.eligibleRunways.empty()) {
            throw runtime_error("No eligible runway for flight " + f.flightId);
        }
        flights.push_back(f);
    }

    if (flights.empty()) throw runtime_error("No flights found in CSV.");

    // Convert absolute timestamps to seconds from the first request.
    for (Flight& f : flights) f.requestTime -= earliestRequest;

    return flights;
}

static vector<Runway> collectRunways(const vector<Flight>& flights) {
    vector<string> names;
    for (const Flight& f : flights) {
        for (const string& r : f.eligibleRunways) {
            if (find(names.begin(), names.end(), r) == names.end()) names.push_back(r);
        }
    }
    sort(names.begin(), names.end());
    vector<Runway> runways;
    for (const string& name : names) runways.push_back({name, 0});
    return runways;
}

static bool eligibleFor(const Flight& f, const string& runwayName) {
    return find(f.eligibleRunways.begin(), f.eligibleRunways.end(), runwayName)
           != f.eligibleRunways.end();
}

static int priorityScore(const Flight& f) {
    // Emergency flights always outrank non-emergencies; within each group,
    // use the workload's priority, then emergency/fuel scores as tie-breakers.
    return f.priority;
}
static vector<ScheduledFlight> scheduleFlights(
    const vector<Flight>& flights,
    const string& algorithm) {

    vector<Runway> runways = collectRunways(flights);
    vector<bool> done(flights.size(), false);
    vector<ScheduledFlight> schedule;
    schedule.reserve(flights.size());

    while (schedule.size() < flights.size()) {
        long long earliestStart = numeric_limits<long long>::max();

        // Find the earliest feasible start time.
        for (size_t i = 0; i < flights.size(); ++i) {
            if (done[i]) continue;

            for (const Runway& runway : runways) {
                if (!eligibleFor(flights[i], runway.name)) continue;

                long long start =
                    max(flights[i].requestTime, runway.availableAt);

                earliestStart = min(earliestStart, start);
            }
        }

        int bestFlight = -1;
        int bestRunway = -1;

        for (size_t i = 0; i < flights.size(); ++i) {
            if (done[i]) continue;

            for (size_t r = 0; r < runways.size(); ++r) {
                if (!eligibleFor(flights[i], runways[r].name)) continue;

                long long start =
                    max(flights[i].requestTime, runways[r].availableAt);

                if (start != earliestStart) continue;

                bool choose = (bestFlight == -1);

                if (!choose &&
                    (algorithm == "priority" || algorithm == "dynamic")) {

                    const Flight& candidate = flights[i];
                    const Flight& current = flights[bestFlight];

                    // Emergency flights retain precedence.
                    if (candidate.emergency != current.emergency) {
                        choose = candidate.emergency;
                    } else {
                        const long long candidateWait =
                            max(0LL, earliestStart - candidate.requestTime);
                        const long long currentWait =
                            max(0LL, earliestStart - current.requestTime);

                        // Starvation prevention applies to dynamic mode.
                        const bool candidateStarving =
                            algorithm == "dynamic" &&
                            candidateWait >= STARVATION_WARNING_SECONDS;

                        const bool currentStarving =
                            algorithm == "dynamic" &&
                            currentWait >= STARVATION_WARNING_SECONDS;

                        if (candidateStarving != currentStarving) {
    // Dynamic mode gives priority to a flight that has
    // crossed the starvation threshold.
    choose = candidateStarving;
} else {
    const int candidatePriority =
        algorithm == "dynamic"
            ? effectivePriority(candidate, candidateWait)
            : priorityScore(candidate);

    const int currentPriority =
        algorithm == "dynamic"
            ? effectivePriority(current, currentWait)
            : priorityScore(current);

    if (candidatePriority != currentPriority) {
        choose = candidatePriority > currentPriority;
    } else if (
        candidate.emergencyScore != current.emergencyScore) {
        choose = candidate.emergencyScore >
                 current.emergencyScore;
    } else if (
        candidate.fuelScore != current.fuelScore) {
        choose = candidate.fuelScore > current.fuelScore;
    } else if (
        candidate.requestTime != current.requestTime) {
        choose = candidate.requestTime < current.requestTime;
    } else {
        choose = candidate.flightId < current.flightId;
    }
}
                    }
                } else if (!choose) {
                    // FCFS ordering remains unchanged.
                    const Flight& candidate = flights[i];
                    const Flight& current = flights[bestFlight];

                    if (candidate.requestTime != current.requestTime) {
                        choose =
                            candidate.requestTime < current.requestTime;
                    } else {
                        choose =
                            candidate.flightId < current.flightId;
                    }
                }

                if (choose) {
                    bestFlight = static_cast<int>(i);
                    bestRunway = static_cast<int>(r);
                }
            }
        }

        if (bestFlight < 0 || bestRunway < 0) {
            throw runtime_error(
                "Scheduler could not find a feasible flight/runway assignment.");
        }

        const Flight& f = flights[bestFlight];
        Runway& runway = runways[bestRunway];

        const long long start =
            max(f.requestTime, runway.availableAt);
        const long long finish = start + f.duration;

        ScheduledFlight result;
        result.flight = f;
        result.assignedRunway = runway.name;
        result.startTime = start;
        result.finishTime = finish;
        result.waitSeconds = start - f.requestTime;

        schedule.push_back(result);

        runway.availableAt = finish;
        done[bestFlight] = true;
    }

    return schedule;
}

static bool validateSchedule(const vector<ScheduledFlight>& schedule) {
    for (const auto& item : schedule) {
        if (item.startTime < item.flight.requestTime) {
            cerr << "ERROR: Flight " << item.flight.flightId
                 << " starts before its request time.\n";
            return false;
        }

        if (item.finishTime < item.startTime ||
            item.finishTime - item.startTime != item.flight.duration) {
            cerr << "ERROR: Invalid finish time for flight "
                 << item.flight.flightId << ".\n";
            return false;
        }

        if (!eligibleFor(item.flight, item.assignedRunway)) {
            cerr << "ERROR: Flight " << item.flight.flightId
                 << " assigned to an ineligible runway.\n";
            return false;
        }
    }

    for (size_t i = 0; i < schedule.size(); ++i) {
        for (size_t j = i + 1; j < schedule.size(); ++j) {
            if (schedule[i].assignedRunway ==
                    schedule[j].assignedRunway &&
                schedule[i].startTime < schedule[j].finishTime &&
                schedule[j].startTime < schedule[i].finishTime) {
                cerr << "ERROR: Runway overlap between "
                     << schedule[i].flight.flightId << " and "
                     << schedule[j].flight.flightId << ".\n";
                return false;
            }
        }
    }

    return true;
}

static void printResults(const vector<ScheduledFlight>& results,
                         const string& algorithm,
                         const vector<Flight>& allFlights) {
                            if (results.empty()) {
    cout << "\nNo flights were scheduled for " << algorithm << ".\n";
    return;
                            }
    long long totalWait = 0;
    long long emergencyWait = 0;
    long long emergencyMaxWait = 0;
    int emergencyCount = 0;

    long long normalWait = 0;
    long long normalMaxWait = 0;
    int normalCount = 0;
    long long maxWait = 0;
    long long firstStart = numeric_limits<long long>::max();
    long long lastFinish = 0;
    long long totalOccupancy = 0;
    long long starvationWarnings = 0;
    for (const auto& item : results) {
        totalWait += item.waitSeconds;
        maxWait = max(maxWait, item.waitSeconds);
        firstStart = min(firstStart, item.startTime);
        lastFinish = max(lastFinish, item.finishTime);
        totalOccupancy += item.flight.duration;
        if (item.flight.emergency) {
            emergencyCount++;
            emergencyWait += item.waitSeconds;
            emergencyMaxWait = max(emergencyMaxWait, item.waitSeconds);
        } else {
            normalCount++;
            normalWait += item.waitSeconds;
            normalMaxWait = max(normalMaxWait, item.waitSeconds);
        }
        if (item.waitSeconds > STARVATION_WARNING_SECONDS) {
        ++starvationWarnings;
    }
    }

    long long makespan = max(1LL, lastFinish);
    vector<Runway> runways = collectRunways(allFlights);
    double utilization = 100.0 * static_cast<double>(totalOccupancy) /
                         (static_cast<double>(makespan) * runways.size());

    cout << "\n========== " << (algorithm == "fcfs" ? "FCFS" :
algorithm == "dynamic" ? "DYNAMIC" : "PRIORITY")
         << " RESULTS ==========\n";
    cout << "Flights scheduled: " << results.size() << "\n";
    cout << "Eligible runways: " << runways.size() << "\n";
    cout << fixed << setprecision(2);
    cout << "Average waiting time: "
         << static_cast<double>(totalWait) / results.size() << " sec\n";
    cout << "Maximum waiting time: " << maxWait << " sec\n";
    cout << "Flights exceeding starvation warning threshold ("
     << STARVATION_WARNING_SECONDS << " sec): "
     << starvationWarnings << "\n";
        if (emergencyCount > 0) {
        cout << "Emergency flights: " << emergencyCount << "\n";
        cout << "Emergency average wait: "
             << static_cast<double>(emergencyWait) / emergencyCount
             << " sec\n";
        cout << "Emergency maximum wait: " << emergencyMaxWait << " sec\n";
    }

    if (normalCount > 0) {
        cout << "Non-emergency average wait: "
             << static_cast<double>(normalWait) / normalCount
             << " sec\n";
        cout << "Non-emergency maximum wait: " << normalMaxWait << " sec\n";
    }
    cout << "Throughput: "
         << (makespan > 0 ? 3600.0 * results.size() / makespan : 0.0)
         << " flights/hour (over schedule makespan)\n";
    cout << "Aggregate runway utilization: " << utilization << "%\n\n";

    cout << "Flight,Operation,Runway,Request(s),Start(s),Finish(s),Wait(s),Duration(s),Priority,Emergency\n";
    
    for (const auto& item : results) {
        cout << '"' << item.flight.flightNumber << "\","
             << '"' << item.flight.operation << "\","
             << '"' << item.assignedRunway << "\","
             << item.flight.requestTime << ","
             << item.startTime << ","
             << item.finishTime << ","
             << item.waitSeconds << ","
             << item.flight.duration << ","
             << item.flight.priority << ","
             << (item.flight.emergency ? "true" : "false") << "\n";
    }
}

int main(int argc, char* argv[]) {
    if (argc < 2 || argc > 3) {
        cerr << "Usage: " << argv[0]
     << " <workload.csv> [fcfs|priority|dynamic|both|all]\n";
        cerr << "Example: " << argv[0]
             << " data/processed/workloads/medium_workload.csv both\n";
        return 1;
    }

    string algorithm = (argc == 3) ? lowerCopy(argv[2]) : "both";

    if (algorithm != "fcfs" &&
        algorithm != "priority" &&
        algorithm != "dynamic" &&
        algorithm != "both" && 
    algorithm != "all") {
        cerr << "Algorithm must be fcfs, priority, dynamic, or both.\n";
        return 1;
    }

    try {
        vector<Flight> flights = loadFlights(argv[1]);

        cout << "Loaded " << flights.size()
             << " flights from " << argv[1] << "\n";

        if (algorithm == "fcfs" ||
    algorithm == "both" ||
    algorithm == "all") {
    auto results = scheduleFlights(flights, "fcfs");
if (!validateSchedule(results)) return 1;
printResults(results, "fcfs", flights);
}

if (algorithm == "priority" ||
    algorithm == "both" ||
    algorithm == "all") {
    auto results = scheduleFlights(flights, "priority");
    if (!validateSchedule(results)) return 1;
printResults(results, "priority", flights);
}

if (algorithm == "dynamic" || algorithm == "all") {
    auto results = scheduleFlights(flights, "dynamic");
    if (!validateSchedule(results)) return 1;
printResults(results, "dynamic", flights);
}

    } catch (const exception& e) {
        cerr << "Scheduler error: " << e.what() << "\n";
        return 1;
    }

    return 0;
}