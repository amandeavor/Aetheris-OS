# Machine Learning-Based Predictive App Preloading

To hide disk read latency on low-spec systems, the operating system can predict which applications the user is likely to open next and preload them into memory before the user clicks them.

---

## Usage Modeling and Preloading Architecture

Traditional preloading utilities (such as `preload`) rely on static file-access statistics, which fail to adapt to changing user habits or specific times of day. A smarter approach is to run a lightweight, background daemon that monitors user application launches and trains a predictive model on-device.

```
+--------------------------------------------------------+
|             Predictive Preloading Pipeline             |
|                                                        |
|  +--------------------+      Tracks      +----------+  |
|  | User Application   | ---------------> | DBus Event|  |
|  | Launch Event       |                  | Monitor  |  |
|  +--------------------+                  +----------+  |
|                                                | Writes |
|                                                v        |
|  +--------------------+   Updates Model  +----------+  |
|  | ONNX/TFLite Model  | <--------------- | SQLite   |  |
|  | (Quantized INT8)   |                  | Database |  |
|  +--------------------+                  +----------+  |
|            |                                            |
|            | Generates Top-N Predictions                |
|            v                                            |
|  +--------------------------------------------------+  |
|  | Preloading Engine: posix_fadvise(POSIX_FADV_WILLNEED)|
|  +--------------------------------------------------+  |
+--------------------------------------------------------+
```

To capture usage sequences without overloading the CPU, the preloading engine tracks three context vectors:

- **Transition Sequence (X_seq):** The order of recently launched applications (e.g., opening a terminal immediately after a text editor).
- **Temporal Bins (X_time):** The current time of day, grouped into four-hour blocks to capture varying morning, afternoon, and evening workflows.
- **Weekly Cadence (X_day):** Discerning different application usage patterns on weekdays versus weekends.

---

## Reference System Prefetch Mechanics

To build an efficient prediction pipeline under Linux, we can learn from prefetching mechanisms used in other operating systems:

**Android App Launch Prediction:** Android tracks user application launches, recording parameters like transition frequency and time of day. When predicting an application launch, Android pre-forks a low-priority process from its persistent "Zygote" template. This populates necessary system libraries in memory beforehand, minimizing CPU execution times during launch.

**Windows SuperFetch / Prefetch:** Windows monitors disk page-fault events during the first 10 seconds of an application's execution. These sector sequences are recorded in a `.pf` scenario file in the system directory. When the prefetcher predicts a launch, it loads these specific sectors sequentially from disk, bypassing random read bottlenecks.

**Linux Implementation:** To implement a similar prefetch engine in Linux, the preloading daemon must trace file access patterns using `fanotify` hooks on standard binary pathways (such as `/usr/bin` or `/usr/share`). When an application is launched, the daemon records which shared library files (`.so`) are loaded during the initialization phase. When a prefetch event is triggered, the daemon opens those specific library file descriptors and uses the `posix_fadvise` system call with the `POSIX_FADV_WILLNEED` flag to populate them in the kernel's page cache.

---

## On-Device Lightweight Inference

Running standard machine learning frameworks like PyTorch or TensorFlow on a 1 GB RAM system is impractical, as they consume several hundred megabytes of memory at idle. Instead, the system must deploy models converted to the Open Neural Network Exchange (ONNX) format or TensorFlow Lite (TFLite), running on an optimized C++ inference engine.

To minimize resource usage, the predictive model must undergo **static 8-bit integer quantization (INT8)** during conversion. This shrinks the model's storage footprint by up to 75% and replaces heavy floating-point math with fast integer calculations, allowing the model to run efficiently on low-resource host CPUs.

```python
import tensorflow as tf

converter = tf.lite.TFLiteConverter.from_saved_model('/var/lib/predictive/model')
converter.optimizations = [tf.lite.Optimize.DEFAULT]

def representative_data_gen():
    for input_value in representative_dataset_generator():
        yield [input_value]

converter.representative_dataset = representative_data_gen
converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
converter.inference_input_type = tf.int8
converter.inference_output_type = tf.int8

quantized_tflite_model = converter.convert()
with open('/var/lib/predictive/model_quant.tflite', 'wb') as f:
    f.write(quantized_tflite_model)
```

The resulting model runs on the TensorFlow Lite C++ interpreter. The daemon uses the XNNPACK delegate, requiring less than 4.5 MB of memory and completing inference calculations in under 2 ms.

### Modeling Approach Comparison

A comparison of predictive modeling options highlights their resource trade-offs:

| Modeling Approach | VmRSS Idle Memory | CPU Utilization | Training Profile | Low-Memory Suitability |
|---|---|---|---|---|
| ONNX Runtime (C++) | ≈35 MiB | Moderate (Vectorized math execution) | Offline training required | Poor (runtime footprint is too large) |
| TensorFlow Lite (INT8) | ≈4.5 MiB | Low (using XNNPACK delegates) | Offline training, simple updates | Moderate (feasible if quantization is enforced) |
| Discrete-Time Markov Chain | <1 MiB | Near Zero (simple matrix lookups) | Real-time, on-device incremental updates | Excellent (requires no machine learning runtime) |

A **discrete-time Markov chain** sequence model is the ideal choice for 1 GB RAM systems. The system's state space represents individual user applications. The transition probability matrix stores the probability of transitioning from application *s_i* to *s_j*. This implementation requires no complex machine learning runtime and runs efficiently on low-resource hardware.
