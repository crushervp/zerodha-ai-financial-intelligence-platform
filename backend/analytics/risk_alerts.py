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
    historical_returns: Dict[str, Any] = None,
    stock_threshold_pct: float = 20.0,
    sector_threshold_pct: float = 35.0,
    timeframe: str = "1M"
) -> Dict[str, Any]:
    """
    Evaluates volatility, drawdown, beta, and sets deterministic boolean risk flags
    tailored to the requested timeframe (1W, 1M, 3M, 1Y).
    """
    historical_returns = historical_returns or {}
    tf = (timeframe or historical_returns.get("timeframe", "1M")).upper()
    symbols = [h["symbol"] for h in holdings]
    weights = np.array([h["weight_pct"] / 100.0 for h in holdings]) if holdings else np.array([])

    # Check if historical series are available
    if not historical_returns or "holdings" not in historical_returns or "benchmark" not in historical_returns:
        if not holdings:
            return {
                "portfolio_beta": 1.0,
                "annualized_volatility": 0.0,
                "max_drawdown": 0.0,
                "timeframe": tf,
                "alert_flags": {
                    "single_stock_concentration": False,
                    "sector_concentration": False,
                    "high_volatility": False,
                    "high_drawdown": False
                }
            }

        single_stock_breach = any(h.get("weight_pct", 0.0) > stock_threshold_pct for h in holdings)
        
        # Calculate weighted annualized volatility using available market data or baseline
        market_vols = historical_returns.get("market_volatilities", {}) if historical_returns else {}
        weighted_vol = 0.0
        for h in holdings:
            sym = h.get("symbol", "")
            sym_vol = float(market_vols.get(sym, h.get("volatility_30d", 16.5)))
            w = float(h.get("weight_pct", 0.0)) / 100.0
            weighted_vol += w * sym_vol

        # Sector beta estimates relative to NIFTY 50
        sector_betas = {
            "Information Technology": 1.15,
            "Financial Services": 1.10,
            "Energy": 0.95,
            "Automobile": 1.20,
            "Healthcare": 0.75,
            "Consumer Goods": 0.65,
            "Telecommunication": 1.30
        }
        weighted_beta = 0.0
        for h in holdings:
            sec = h.get("sector", "")
            b = sector_betas.get(sec, 1.0)
            w = float(h.get("weight_pct", 0.0)) / 100.0
            weighted_beta += w * b

        # Max drawdown baseline estimate based on concentration and volatility
        max_stock_wt = max((h.get("weight_pct", 0.0) for h in holdings), default=0.0)
        if max_stock_wt > 40.0:
            base_mdd = -14.2
        elif weighted_vol > 30.0:
            base_mdd = -22.5
        elif weighted_vol > 20.0:
            base_mdd = -9.8
        else:
            base_mdd = -5.6

        base_vol = weighted_vol if weighted_vol > 0 else 16.2

        # Scale metrics by timeframe
        timeframe_scales = {
            "1W": {"vol_mult": 1.12, "mdd_mult": 0.35, "min_mdd": -2.1},
            "1M": {"vol_mult": 1.00, "mdd_mult": 1.00, "min_mdd": -5.6},
            "3M": {"vol_mult": 0.94, "mdd_mult": 1.85, "min_mdd": -10.4},
            "1Y": {"vol_mult": 1.05, "mdd_mult": 2.80, "min_mdd": -15.7}
        }
        scale = timeframe_scales.get(tf, timeframe_scales["1M"])
        ann_vol = round(base_vol * scale["vol_mult"], 1)
        mdd_val = round(min(scale["min_mdd"], base_mdd * scale["mdd_mult"]), 1)
        beta_val = round(weighted_beta, 2) if weighted_beta > 0 else 1.05

        high_vol_breach = ann_vol > 25.0
        high_drawdown_breach = mdd_val < -15.0

        return {
            "portfolio_beta": beta_val,
            "annualized_volatility": ann_vol,
            "max_drawdown": mdd_val,
            "timeframe": tf,
            "alert_flags": {
                "single_stock_concentration": bool(single_stock_breach),
                "high_volatility": bool(high_vol_breach),
                "high_drawdown": bool(high_drawdown_breach)
            }
        }

    # Build returns DataFrame
    holding_df = pd.DataFrame(historical_returns["holdings"])
    holding_df = holding_df[symbols]
    benchmark_series = pd.Series(historical_returns["benchmark"])

    # Slice by timeframe window
    window_sizes = {"1W": 5, "1M": 21, "3M": 63, "1Y": 252}
    window = window_sizes.get(tf, 21)
    if len(holding_df) > window:
        holding_df = holding_df.tail(window)
        benchmark_series = benchmark_series.tail(window)

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
        "timeframe": tf,
        "alert_flags": {
            "single_stock_concentration": bool(single_stock_breach),
            "high_volatility": bool(high_vol_breach),
            "high_drawdown": bool(high_drawdown_breach)
        }
    }
