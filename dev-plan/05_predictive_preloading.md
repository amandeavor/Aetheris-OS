# Sub-Plan 05: Predictive App Preloading (VelocityMind)

This plan covers usage modeling, the Discrete-Time Markov Chain prediction model, and C daemon integration with page-cache prefetching.

---

## 1. Usage Modeling Context Vectors

VelocityMind records system transitions across three variables:
1.  **Transition Sequence ($X_{seq}$):** Tracks sequential app launches (e.g., launching a terminal after an editor).
2.  **Temporal Bins ($X_{time}$):** Groups system time into four 6-hour blocks:
    - `06:00 - 12:00` (Morning)
    - `12:00 - 18:00` (Afternoon)
    - `18:00 - 00:00` (Evening)
    - `00:00 - 06:00` (Night)
3.  **Weekly Cadence ($X_{day}$):** Distinguishes weekdays from weekends.

---

## 2. Discrete-Time Markov Chain Prediction

The application lifecycle functions as a Markov Chain. At state $s_i$, the transition probability to $s_j$ within temporal bin $t$ is computed as:

$$P_{ij}(t) = \frac{N_{ij}(t)}{\sum_{m=1}^{N} N_{im}(t)}$$

The prediction engine selects the transition with the highest probability value:

$$j^* = \arg\max_{j \in S} P_{ij}(t)$$

---

## 3. C Daemon Implementation (`velocitymind/daemon.c`)

The daemon is written in C and compiled with `-Os` to keep the memory footprint under 1MB.

### Key Logic:
- **`get_current_temporal_bin()`**: Determines the time block based on system time.
- **`initialize_database()`**: Creates SQLite tables for transitions and applications.
- **`predict_and_prefetch()`**: Queries the database for the highest-probability next app and triggers caching.
- **`trigger_cache_prefetch()`**: Opens the predicted application binary and invokes the `posix_fadvise` system call with the `POSIX_FADV_WILLNEED` flag to load pages into RAM:
  ```c
  posix_fadvise(fd, 0, file_info.st_size, POSIX_FADV_WILLNEED);
  ```

### Build Instructions:
Navigate to the directory and run:
```bash
make
```
Executes `gcc -Os -Wall -o velocitymind daemon.c -lsqlite3`.
