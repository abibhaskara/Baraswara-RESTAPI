import numpy as np

def inject_laplace_noise(true_value: float, epsilon: float, sensitivity: float = 1.0) -> float:
    scale = sensitivity / epsilon
    noise = np.random.laplace(0, scale)
    return float(true_value + noise)