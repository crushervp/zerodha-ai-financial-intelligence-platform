import os
import csv
import io
import json
import hashlib
import urllib.request
import urllib.parse
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

# In-memory store for active Zerodha user session
ZERODHA_SESSION: Dict[str, Any] = {
    "is_connected": False,
    "user_id": None,
    "user_name": None,
    "email": None,
    "broker": "ZERODHA",
    "access_token": None,
    "connected_at": None,
    "holdings": [],
    "live_market_synced": False
}

def get_active_session() -> Dict[str, Any]:
    """Returns the live active session dictionary."""
    return ZERODHA_SESSION

DEMO_ZERODHA_PROFILES = {
    "ZR1001": {
        "user_id": "ZR1001",
        "user_name": "Rahul Sharma",
        "email": "rahul.sharma@zerodha.user",
        "holdings": [
            {"symbol": "RELIANCE", "sector": "Energy", "quantity": 50, "average_price": 2420.0, "current_price": 2550.0},
            {"symbol": "HDFCBANK", "sector": "Financial Services", "quantity": 120, "average_price": 1475.0, "current_price": 1520.0},
            {"symbol": "INFY", "sector": "Information Technology", "quantity": 90, "average_price": 1390.0, "current_price": 1380.0},
            {"symbol": "TATAMOTORS", "sector": "Automobile", "quantity": 150, "average_price": 890.0, "current_price": 920.0},
            {"symbol": "ICICIBANK", "sector": "Financial Services", "quantity": 80, "average_price": 990.0, "current_price": 1050.0},
            {"symbol": "TCS", "sector": "Information Technology", "quantity": 30, "average_price": 3520.0, "current_price": 3600.0}
        ]
    },
    "ZR2002": {
        "user_id": "ZR2002",
        "user_name": "Priya Patel",
        "email": "priya.patel@zerodha.user",
        "holdings": [
            {"symbol": "HDFCBANK", "sector": "Financial Services", "quantity": 250, "average_price": 1460.0, "current_price": 1520.0},
            {"symbol": "ICICIBANK", "sector": "Financial Services", "quantity": 300, "average_price": 980.0, "current_price": 1050.0},
            {"symbol": "SBIN", "sector": "Financial Services", "quantity": 220, "average_price": 740.0, "current_price": 780.0},
            {"symbol": "YESBANK", "sector": "Financial Services", "quantity": 2000, "average_price": 22.5, "current_price": 19.5},
            {"symbol": "INFY", "sector": "Information Technology", "quantity": 40, "average_price": 1410.0, "current_price": 1380.0}
        ]
    }
}

SECTOR_MAP = {
    "RELIANCE": "Energy",
    "HDFCBANK": "Financial Services",
    "ICICIBANK": "Financial Services",
    "SBIN": "Financial Services",
    "YESBANK": "Financial Services",
    "INFY": "Information Technology",
    "TCS": "Information Technology",
    "TATAMOTORS": "Automobile",
    "SUNPHARMA": "Healthcare",
    "SUZLON": "Energy",
    "IDEA": "Telecommunication",
    "ITC": "Consumer Goods",
    "WIPRO": "Information Technology",
    "AXISBANK": "Financial Services",
    "KOTAKBANK": "Financial Services",
    "LT": "Construction",
    "BHARTIARTL": "Telecommunication"
}

def fetch_live_quote_nse(symbol: str) -> Optional[Dict[str, Any]]:
    """
    Fetches real-time market price and day change for an NSE stock.
    Uses Yahoo Finance API with graceful fallback.
    """
    clean_sym = symbol.upper().replace(".NS", "")
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{clean_sym}.NS?interval=1d&range=5d"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    
    try:
        with urllib.request.urlopen(req, timeout=4) as response:
            data = json.loads(response.read().decode("utf-8"))
            result = data.get("chart", {}).get("result", [])
            if not result:
                return None
            meta = result[0].get("meta", {})
            current_price = meta.get("regularMarketPrice")
            prev_close = meta.get("chartPreviousClose") or current_price
            if current_price is None:
                return None
            day_change_pct = round(((current_price - prev_close) / prev_close) * 100, 2) if prev_close else 0.0
            return {
                "symbol": clean_sym,
                "current_price": float(current_price),
                "day_change_pct": day_change_pct,
                "freshness": "REAL_TIME",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
    except Exception:
        return None

def sync_holdings_with_live_market(holdings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Refreshes holding current prices against live market quotes where possible.
    """
    updated_holdings = []
    for h in holdings:
        sym = h.get("symbol", "").upper()
        live = fetch_live_quote_nse(sym)
        current_price = live["current_price"] if live else float(h.get("current_price", h.get("average_price", 0.0)))
        qty = int(h.get("quantity", 0))
        avg_price = float(h.get("average_price", 0.0))
        invested = qty * avg_price
        cur_val = qty * current_price
        pnl = cur_val - invested

        updated_holdings.append({
            "instrument_id": f"NSE_{sym}",
            "symbol": sym,
            "sector": h.get("sector") or SECTOR_MAP.get(sym, "Diversified"),
            "quantity": qty,
            "average_price": round(avg_price, 2),
            "current_price": round(current_price, 2),
            "invested_value": round(invested, 2),
            "current_value": round(cur_val, 2),
            "unrealized_pnl": round(pnl, 2),
            "live_synced": live is not None,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    return updated_holdings

def authenticate_zerodha_user(
    auth_type: str = "DEMO",
    client_id: Optional[str] = "ZR1001",
    password: Optional[str] = None,
    totp: Optional[str] = None,
    api_key: Optional[str] = None,
    access_token: Optional[str] = None,
    request_token: Optional[str] = None,
    api_secret: Optional[str] = None
) -> Dict[str, Any]:
    """
    Authenticates a Zerodha user either via Kite Connect API or interactive login.
    """
    global ZERODHA_SESSION

    # 1. Official Kite Connect Session Exchange
    if auth_type == "KITE_CONNECT":
        if api_key and access_token:
            token = access_token
        elif api_key and request_token and api_secret:
            checksum = hashlib.sha256(f"{api_key}{request_token}{api_secret}".encode("utf-8")).hexdigest()
            url = "https://api.kite.trade/session/token"
            data = urllib.parse.urlencode({
                "api_key": api_key,
                "request_token": request_token,
                "checksum": checksum
            }).encode("utf-8")
            req = urllib.request.Request(url, data=data, headers={"X-Kite-Version": "3"})
            try:
                with urllib.request.urlopen(req, timeout=8) as resp:
                    res_json = json.loads(resp.read().decode("utf-8"))
                    token_data = res_json.get("data", {})
                    token = token_data.get("access_token")
                    client_id = token_data.get("user_id", "KITE_USER")
            except Exception as e:
                raise ValueError(f"Kite Connect API authentication failed: {e}")
        else:
            raise ValueError("Kite Connect requires either (api_key + access_token) or (api_key + request_token + api_secret)")

        holdings = fetch_kite_live_holdings(api_key, token)
        ZERODHA_SESSION.clear()
        ZERODHA_SESSION.update({
            "is_connected": True,
            "user_id": client_id,
            "user_name": f"Kite User ({client_id})",
            "email": f"{str(client_id).lower()}@zerodha.user",
            "broker": "ZERODHA",
            "access_token": token[:6] + "..." if token else None,
            "connected_at": datetime.now(timezone.utc).isoformat(),
            "holdings": holdings,
            "live_market_synced": True
        })
        return ZERODHA_SESSION

    # 2. Interactive / Demo Zerodha Kite Login
    cid = (client_id or "ZR1001").strip().upper()
    profile = DEMO_ZERODHA_PROFILES.get(cid)
    if not profile:
        profile = {
            "user_id": cid,
            "user_name": f"Investor {cid}",
            "email": f"{cid.lower()}@zerodha.user",
            "holdings": DEMO_ZERODHA_PROFILES["ZR1001"]["holdings"]
        }

    synced_holdings = sync_holdings_with_live_market(profile["holdings"])

    ZERODHA_SESSION.clear()
    ZERODHA_SESSION.update({
        "is_connected": True,
        "user_id": profile["user_id"],
        "user_name": profile["user_name"],
        "email": profile["email"],
        "broker": "ZERODHA",
        "access_token": f"live_sess_{profile['user_id']}",
        "connected_at": datetime.now(timezone.utc).isoformat(),
        "holdings": synced_holdings,
        "live_market_synced": True
    })
    return ZERODHA_SESSION

def fetch_kite_live_holdings(api_key: str, access_token: str) -> List[Dict[str, Any]]:
    """
    Calls official Kite Connect REST API: GET https://api.kite.trade/portfolio/holdings
    """
    url = "https://api.kite.trade/portfolio/holdings"
    req = urllib.request.Request(url, headers={
        "X-Kite-Version": "3",
        "Authorization": f"token {api_key}:{access_token}",
        "User-Agent": "ZerodhaAIFinancialPlatform/1.0"
    })
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            raw_holdings = data.get("data", [])
            holdings = []
            for item in raw_holdings:
                sym = item.get("tradingsymbol", "").upper()
                qty = int(item.get("quantity", 0))
                avg_p = float(item.get("average_price", 0.0) or item.get("price", 0.0))
                ltp = float(item.get("last_price", 0.0))
                holdings.append({
                    "instrument_id": f"NSE_{sym}",
                    "symbol": sym,
                    "sector": SECTOR_MAP.get(sym, "Diversified"),
                    "quantity": qty,
                    "average_price": avg_p,
                    "current_price": ltp,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
            return sync_holdings_with_live_market(holdings)
    except Exception as e:
        raise ValueError(f"Failed to fetch holdings from Kite Connect: {e}")

def parse_kite_holdings_csv(csv_text: str) -> List[Dict[str, Any]]:
    """
    Parses a Zerodha Kite exported holdings statement CSV.
    """
    holdings = []
    f = io.StringIO(csv_text.strip())
    reader = csv.DictReader(f)
    for row in reader:
        sym = (row.get("Instrument") or row.get("symbol") or row.get("tradingsymbol") or "").strip().upper()
        if not sym:
            continue
        try:
            qty_raw = row.get("Qty.") or row.get("Qty") or row.get("quantity") or 0
            qty = int(float(str(qty_raw).replace(",", "")))
            
            avg_raw = row.get("Avg. cost") or row.get("average_price") or row.get("Avg. price") or 0.0
            avg_price = float(str(avg_raw).replace(",", "").replace("₹", ""))

            ltp_raw = row.get("LTP") or row.get("current_price") or row.get("Last price") or avg_price
            ltp = float(str(ltp_raw).replace(",", "").replace("₹", ""))

            holdings.append({
                "instrument_id": f"NSE_{sym}",
                "symbol": sym,
                "sector": SECTOR_MAP.get(sym, "Diversified"),
                "quantity": qty,
                "average_price": avg_price,
                "current_price": ltp,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        except Exception:
            continue

    if not holdings:
        raise ValueError("Could not parse any valid holdings from the provided CSV.")

    return sync_holdings_with_live_market(holdings)

def disconnect_zerodha_session():
    """Clears the active Zerodha session."""
    global ZERODHA_SESSION
    ZERODHA_SESSION.clear()
    ZERODHA_SESSION.update({
        "is_connected": False,
        "user_id": None,
        "user_name": None,
        "email": None,
        "broker": "ZERODHA",
        "access_token": None,
        "connected_at": None,
        "holdings": [],
        "live_market_synced": False
    })
    return {"status": "SUCCESS", "message": "Zerodha session disconnected"}
