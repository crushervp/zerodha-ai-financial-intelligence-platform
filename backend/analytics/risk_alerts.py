import numpy as np
import pandas as pd
from typing import Dict, List, Any

def compute_max_drawdown(cumulative_returns: np.ndarray) -> float:
    """Computes peak-to-trough decline percentage."""
    if len(cumulative_returns) == 0:
        return 0.0
    cum_wealth = np.cumprod(1 + cumulative_returns)
    running_max = np.maximum.accumulate(cum_wealth)
    drawdowns = (cum_wealth - running_max) / running_max
    return float(np.min(drawdowns) * 100.0)

def compute_portfolio_beta(holding_returns: pd.DataFrame, benchmark_returns: pd.Series, weights: np.ndarray) -> float:
    """Calculates weighted portfolio beta relative to the benchmark."""
    cov_matrix = np.cov(benchmark_returns, holding_returns.T)
    var_benchmark = np.var(benchmark_returns)
    if var_benchmark == 0 or np.isnan(var_benchmark):
        return 1.0
    betas = cov_matrix[0, 1:] / var_benchmark
    portfolio_beta = float(np.dot(weights, betas))
    return portfolio_beta

def evaluate_risk_metrics(
    holdings: List[Dict[str, Any]], 
    historical_returns: Dict[str, Any],
    stock_threshold_pct: float = 20.0,
    sector_threshold_pct: float = 35.0
) -> Dict[str, Any]:
    """
    Evaluates volatility, drawdown, beta, and sets deterministic boolean risk flags.
    """
    symbols = [h["symbol"] for h in holdings]
    weights = np.array([h["weight_pct"] / 100.0 for h in holdings])

    # Check if historical series are available
    if not historical_returns or "holdings" not in historical_returns or "benchmark" not in historical_returns:
        # Fallback when historical tick data is not provided
        single_stock_breach = any(h["weight_pct"] > stock_threshold_pct for h in holdings)
        return {
            "portfolio_beta": 1.0,
            "annualized_volatility": 0.0,
            "max_drawdown": 0.0,
            "alert_flags": {
                "single_stock_concentration": single_stock_breach,
                "sector_concentration": False,
                "high_volatility": False,
                "high_drawdown": False
            }
        }

    # Build returns DataFrame
    holding_df = pd.DataFrame(historical_returns["holdings"])
    # Align order of symbols
    holding_df = holding_df[symbols]
    benchmark_series = pd.Series(historical_returns["benchmark"])

    # Daily weighted portfolio returns
    portfolio_daily_returns = holding_df.dot(weights).values

    # Annualized Volatility (252 trading days)
    daily_vol = np.std(portfolio_daily_returns, ddof=1) if len(portfolio_daily_returns) > 1 else 0.0
    annualized_vol = float(daily_vol * np.sqrt(252) * 100.0)

    # Maximum Drawdown
    mdd = compute_max_drawdown(portfolio_daily_returns)

    # Portfolio Beta
    beta = compute_portfolio_beta(holding_df, benchmark_series, weights)

    # Boolean risk triggers
    single_stock_breach = any(h["weight_pct"] > stock_threshold_pct for h in holdings)
    high_vol_breach = annualized_vol > 25.0
    high_drawdown_breach = mdd < -15.0

    return {
        "portfolio_beta": round(beta, 2),
        "annualized_volatility": round(annualized_vol, 2),
        "max_drawdown": round(mdd, 2),
        "alert_flags": {
            "single_stock_concentration": bool(single_stock_breach),
            "high_volatility": bool(high_vol_breach),
            "high_drawdown": bool(high_drawdown_breach)
        }
    }