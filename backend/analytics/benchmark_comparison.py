import numpy as np
from typing import Dict, Any

def compare_with_benchmark(
    portfolio_returns: np.ndarray, 
    benchmark_returns: np.ndarray, 
    benchmark_name: str = "NIFTY 50"
) -> Dict[str, Any]:
    """
    Calculates total window return for both portfolio and benchmark,
    and isolates relative outperformance (Alpha proxy).
    """
    if len(portfolio_returns) == 0 or len(benchmark_returns) == 0:
        return {
            "benchmark_name": benchmark_name,
            "portfolio_return_pct": 0.0,
            "benchmark_return_pct": 0.0,
            "alpha_pct": 0.0,
            "performance_status": "NEUTRAL"
        }

    port_cum = float(np.prod(1 + portfolio_returns) - 1.0) * 100.0
    bench_cum = float(np.prod(1 + benchmark_returns) - 1.0) * 100.0
    alpha = port_cum - bench_cum

    if alpha > 1.5:
        status = "OUTPERFORMING"
    elif alpha < -1.5:
        status = "UNDERPERFORMING"
    else:
        status = "IN_LINE"

    return {
        "benchmark_name": benchmark_name,
        "portfolio_return_pct": round(port_cum, 2),
        "benchmark_return_pct": round(bench_cum, 2),
        "alpha_pct": round(alpha, 2),
        "performance_status": status
    }