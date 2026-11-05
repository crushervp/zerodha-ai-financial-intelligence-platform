import os
import csv
import io
import json
import hashlib
import urllib.request
import urllib.parse
import httpx
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

SESSION_CACHE_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".zerodha_session.json"))

def _save_session_cache():
    try:
        with open(SESSION_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(ZERODHA_SESSION, f)
    except Exception:
        pass

def _load_session_cache():
    if os.path.exists(SESSION_CACHE_FILE):
        try:
            with open(SESSION_CACHE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if data.get("is_connected"):
                    ZERODHA_SESSION.clear()
                    ZERODHA_SESSION.update(data)
        except Exception:
            pass

_load_session_cache()

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

def _fetch_and_build_enctoken_session(
    client: httpx.Client,
    enctoken: str,
    user_id: str,
    user_name: str,
    email: str
) -> Dict[str, Any]:
    """
    Given an active Zerodha enctoken, queries OMS for portfolio holdings and profile.
    """
    global ZERODHA_SESSION
    clean_enctoken = enctoken.strip().strip('"').strip("'")
    client.cookies.set("enctoken", clean_enctoken)
    req_headers = {
        "Authorization": f"enctoken {clean_enctoken}",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Referer": "https://kite.zerodha.com/",
        "Accept": "application/json, text/plain, */*",
    }

    # Query full profile if available
    try:
        prof_resp = client.get(
            "https://kite.zerodha.com/oms/user/profile/full",
            headers=req_headers
        )
        if prof_resp.status_code == 200:
            p_data = prof_resp.json().get("data", {})
            user_id = p_data.get("user_id") or user_id
            user_name = p_data.get("user_name") or user_name
            email = p_data.get("email") or email
    except Exception:
        pass

    # Query portfolio holdings
    holdings_resp = client.get(
        "https://kite.zerodha.com/oms/portfolio/holdings",
        headers=req_headers
    )
    if holdings_resp.status_code != 200:
        raise ValueError(f"Zerodha OMS returned HTTP {holdings_resp.status_code}. The session token may be invalid or expired.")

    try:
        holdings_json = holdings_resp.json()
    except Exception:
        raise ValueError("Invalid JSON response received from Zerodha OMS.")

    if holdings_json.get("status") == "error":
        err_msg = holdings_json.get("message") or "Failed to retrieve holdings."
        raise ValueError(f"Zerodha OMS Error: {err_msg}")

    raw_items = holdings_json.get("data", [])
    holdings = []
    existing_symbols = set()

    for item in raw_items:
        sym = str(item.get("tradingsymbol", "")).upper()
        if not sym:
            continue
        q_settled = int(item.get("quantity", 0) or 0)
        q_t1 = int(item.get("t1_quantity", 0) or 0)
        q_auth = int(item.get("authorised_quantity", 0) or 0)
        q_pledged = int(item.get("pledged_quantity", 0) or 0)
        q_realised = int(item.get("realised_quantity", 0) or 0)

        qty = q_settled + q_t1
        if qty <= 0:
            qty = max(q_auth, q_pledged, q_realised)
        if qty <= 0:
            continue

        avg_p = float(item.get("average_price", 0.0) or item.get("price", 0.0) or 0.0)
        ltp = float(item.get("last_price", 0.0) or avg_p)
        holdings.append({
            "instrument_id": f"NSE_{sym}",
            "symbol": sym,
            "sector": SECTOR_MAP.get(sym, "Diversified"),
            "quantity": qty,
            "average_price": round(avg_p, 2),
            "current_price": round(ltp, 2),
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        existing_symbols.add(sym)

    # Check for same-day CNC delivery positions
    try:
        pos_resp = client.get(
            "https://kite.zerodha.com/oms/portfolio/positions",
            headers=req_headers
        )
        if pos_resp.status_code == 200:
            pos_data = pos_resp.json().get("data", {})
            net_positions = pos_data.get("net", [])
            for pos in net_positions:
                pos_sym = str(pos.get("tradingsymbol", "")).upper()
                pos_prod = str(pos.get("product", "")).upper()
                pos_qty = int(pos.get("quantity", 0) or 0)
                if pos_prod == "CNC" and pos_qty > 0 and pos_sym not in existing_symbols:
                    avg_p = float(pos.get("average_price", 0.0) or pos.get("buy_price", 0.0) or 0.0)
                    ltp = float(pos.get("last_price", 0.0) or avg_p)
                    holdings.append({
                        "instrument_id": f"NSE_{pos_sym}",
                        "symbol": pos_sym,
                        "sector": SECTOR_MAP.get(pos_sym, "Diversified"),
                        "quantity": pos_qty,
                        "average_price": round(avg_p, 2),
                        "current_price": round(ltp, 2),
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })
                    existing_symbols.add(pos_sym)
    except Exception:
        pass

    print(f"[Zerodha Portfolio] Successfully retrieved {len(holdings)} holdings for user {user_name} ({user_id})")

    synced_holdings = sync_holdings_with_live_market(holdings) if holdings else []

    ZERODHA_SESSION.clear()
    ZERODHA_SESSION.update({
        "is_connected": True,
        "user_id": user_id,
        "user_name": user_name,
        "email": email,
        "broker": "ZERODHA",
        "access_token": f"enctoken_{clean_enctoken[:8]}...",
        "connected_at": datetime.now(timezone.utc).isoformat(),
        "holdings": synced_holdings,
        "live_market_synced": True
    })
    _save_session_cache()
    return ZERODHA_SESSION

def fetch_kite_holdings_by_enctoken(enctoken: str) -> Dict[str, Any]:
    """
    Connects to Zerodha using an active enctoken copied from Kite web.
    """
    if not enctoken or not enctoken.strip():
        raise ValueError("Please provide a valid Zerodha enctoken.")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Referer": "https://kite.zerodha.com/",
        "Accept": "application/json, text/plain, */*",
    }
    with httpx.Client(headers=headers, timeout=12.0) as client:
        return _fetch_and_build_enctoken_session(
            client=client,
            enctoken=enctoken,
            user_id="KITE_USER",
            user_name="Zerodha Investor",
            email="investor@zerodha.user"
        )

def login_zerodha_kite_web(
    client_id: str,
    password: str,
    totp: Optional[str] = None
) -> Dict[str, Any]:
    """
    Authenticates directly with Zerodha Kite web API using credentials and 2FA TOTP,
    then retrieves real holdings from Zerodha OMS.
    """
    if not client_id or not client_id.strip():
        raise ValueError("Zerodha Client ID (User ID) is required.")
    if not password or not password.strip():
        raise ValueError("Zerodha Kite password is required.")

    clean_cid = client_id.strip().upper()
    clean_totp = str(totp).strip().replace(" ", "") if totp else ""

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Referer": "https://kite.zerodha.com/",
        "Accept": "application/json, text/plain, */*",
    }

    with httpx.Client(headers=headers, timeout=12.0) as client:
        # Step 1: Login request
        try:
            login_resp = client.post(
                "https://kite.zerodha.com/api/login",
                data={"user_id": clean_cid, "password": password}
            )
            login_data = login_resp.json()
        except httpx.RequestError as exc:
            raise ValueError(f"Unable to reach Zerodha Kite servers: {exc}")
        except Exception:
            raise ValueError(f"Zerodha login service returned HTTP {login_resp.status_code}")

        if login_data.get("status") == "error":
            err_msg = login_data.get("message") or "Invalid Zerodha Client ID or password."
            raise ValueError(f"Zerodha Login Failed: {err_msg}")

        login_info = login_data.get("data", {})
        request_id = login_info.get("request_id")
        if not request_id:
            raise ValueError("Zerodha did not return a valid 2FA request ID.")

        server_twofa_type = login_info.get("twofa_type")
        server_twofa_types = login_info.get("twofa_types") or []

        # Step 2: 2FA Authentication
        if not clean_totp:
            raise ValueError("Zerodha requires your 6-digit App 2FA Code (from your Kite mobile app profile or Google Authenticator).")

        # Dynamically determine twofa_type based on account settings
        candidate_types = []
        if server_twofa_type and str(server_twofa_type).strip():
            candidate_types.append(str(server_twofa_type).strip())
        if isinstance(server_twofa_types, list):
            for t in server_twofa_types:
                if t and str(t).strip() and str(t).strip() not in candidate_types:
                    candidate_types.append(str(t).strip())
        # Try both common 2FA methods if not explicitly matched
        for fallback in ["app_code", "totp", "sms", "email"]:
            if fallback not in candidate_types:
                candidate_types.append(fallback)

        twofa_data = None
        twofa_resp = None
        last_error = None

        for t_type in candidate_types:
            try:
                resp = client.post(
                    "https://kite.zerodha.com/api/twofa",
                    data={
                        "user_id": clean_cid,
                        "request_id": request_id,
                        "twofa_value": clean_totp,
                        "twofa_type": t_type,
                        "skip_session": ""
                    }
                )
                data = resp.json()
            except httpx.RequestError as exc:
                raise ValueError(f"Unable to reach Zerodha 2FA service: {exc}")
            except Exception:
                continue

            if data.get("status") == "success":
                twofa_data = data
                twofa_resp = resp
                break
            else:
                msg = data.get("message") or "Invalid 2FA code."
                last_error = msg
                # If Zerodha indicates this 2FA type is not the one configured, try next candidate
                if "requested 2FA type is not available" in msg:
                    continue
                else:
                    # Invalid code or expired session
                    raise ValueError(f"Zerodha 2FA Failed: {msg}")

        if not twofa_data:
            raise ValueError(f"Zerodha 2FA Failed: {last_error or 'Unable to verify 2FA code. Please ensure your 6-digit code is current.'}")

        # Step 3: Extract enctoken
        enctoken = client.cookies.get("enctoken")
        if not enctoken:
            for header_val in twofa_resp.headers.get_list("set-cookie"):
                if "enctoken=" in header_val:
                    enctoken = header_val.split("enctoken=")[1].split(";")[0]
                    break

        if not enctoken:
            enctoken = client.cookies.get("kf_session")

        if not enctoken:
            raise ValueError("Authentication succeeded, but Zerodha did not issue an active session token (enctoken).")

        user_info = twofa_data.get("data", {})
        user_name = user_info.get("user_name") or f"Zerodha Investor ({clean_cid})"
        email = user_info.get("email") or f"{clean_cid.lower()}@zerodha.user"

        return _fetch_and_build_enctoken_session(client, enctoken, clean_cid, user_name, email)

def authenticate_zerodha_user(
    auth_type: str = "DEMO",
    client_id: Optional[str] = "ZR1001",
    password: Optional[str] = None,
    totp: Optional[str] = None,
    enctoken: Optional[str] = None,
    api_key: Optional[str] = None,
    access_token: Optional[str] = None,
    request_token: Optional[str] = None,
    api_secret: Optional[str] = None
) -> Dict[str, Any]:
    """
    Authenticates a Zerodha user via:
    1. Real interactive Kite Web login (client_id + password + 2FA TOTP)
    2. Kite enctoken direct session
    3. Official Kite Connect API (api_key + access_token / request_token + api_secret)
    4. Simulated Demo account (ZR1001 / ZR2002)
    """
    global ZERODHA_SESSION

    # 1. Enctoken direct session
    if auth_type == "ENCTOKEN" or enctoken:
        return fetch_kite_holdings_by_enctoken(enctoken or access_token)

    # 2. Official Kite Connect Session Exchange
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
        _save_session_cache()
        return ZERODHA_SESSION

    # 3. Real Kite Web Interactive Login (Credentials + TOTP)
    cid = (client_id or "").strip().upper()
    if auth_type == "KITE_WEB" or (password and cid not in DEMO_ZERODHA_PROFILES):
        return login_zerodha_kite_web(client_id=cid, password=password, totp=totp)

    # 4. Explicit Demo Zerodha Accounts
    if cid in DEMO_ZERODHA_PROFILES:
        profile = DEMO_ZERODHA_PROFILES[cid]
        synced_holdings = sync_holdings_with_live_market(profile["holdings"])
        ZERODHA_SESSION.clear()
        ZERODHA_SESSION.update({
            "is_connected": True,
            "user_id": profile["user_id"],
            "user_name": profile["user_name"],
            "email": profile["email"],
            "broker": "ZERODHA",
            "access_token": f"demo_sess_{profile['user_id']}",
            "connected_at": datetime.now(timezone.utc).isoformat(),
            "holdings": synced_holdings,
            "live_market_synced": True
        })
        _save_session_cache()
        return ZERODHA_SESSION

    # If demo mode was requested with an unconfigured ID without credentials
    raise ValueError(
        f"'{cid}' is not a recognized demo account. "
        "Available demo accounts: ZR1001, ZR2002. "
        "To connect your real Zerodha account, please use the 'Real Kite Login' tab with your credentials & TOTP, "
        "or upload your holdings statement CSV in the 'Upload Statement' tab."
    )

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
                sym = str(item.get("tradingsymbol", "")).upper()
                qty = int(item.get("quantity", 0))
                if qty <= 0:
                    continue
                avg_p = float(item.get("average_price", 0.0) or item.get("price", 0.0))
                ltp = float(item.get("last_price", 0.0) or avg_p)
                holdings.append({
                    "instrument_id": f"NSE_{sym}",
                    "symbol": sym,
                    "sector": SECTOR_MAP.get(sym, "Diversified"),
                    "quantity": qty,
                    "average_price": round(avg_p, 2),
                    "current_price": round(ltp, 2),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
            return sync_holdings_with_live_market(holdings)
    except Exception as e:
        raise ValueError(f"Failed to fetch holdings from Kite Connect: {e}")

def parse_kite_holdings_csv(csv_text: str) -> List[Dict[str, Any]]:
    """
    Parses a Zerodha Kite exported holdings statement CSV (Kite Web or Zerodha Console).
    """
    holdings = []
    cleaned_csv = csv_text.strip().lstrip('\ufeff')
    f = io.StringIO(cleaned_csv)
    reader = csv.DictReader(f)
    for row in reader:
        if not row:
            continue
        # Find symbol across Kite Web, Console, and generic formats
        sym = None
        for key in ["Instrument", "symbol", "Symbol", "tradingsymbol", "Tradingsymbol", "Stock"]:
            val = row.get(key)
            if val and val.strip():
                sym = val.strip().upper()
                break
        if not sym or sym in ["TOTAL", "SUBTOTAL"]:
            continue

        # Find quantity
        qty = 0
        for key in ["Qty.", "Qty", "quantity", "Quantity", "Quantity Available", "Total Qty"]:
            val = row.get(key)
            if val is not None and str(val).strip():
                try:
                    qty = int(float(str(val).replace(",", "").strip()))
                    break
                except (ValueError, TypeError):
                    pass
        if qty <= 0:
            continue

        # Find average price
        avg_price = 0.0
        for key in ["Avg. cost", "Avg cost", "average_price", "Average Price", "Avg. price", "Buy Price"]:
            val = row.get(key)
            if val is not None and str(val).strip():
                try:
                    avg_price = float(str(val).replace(",", "").replace("₹", "").strip())
                    break
                except (ValueError, TypeError):
                    pass

        # Find LTP / Current price
        ltp = avg_price
        for key in ["LTP", "Last price", "current_price", "Current Price", "Cur. val", "Previous Closing Price"]:
            val = row.get(key)
            if val is not None and str(val).strip():
                try:
                    v = float(str(val).replace(",", "").replace("₹", "").strip())
                    if key == "Cur. val" and qty > 0:
                        v = v / qty
                    ltp = v
                    break
                except (ValueError, TypeError):
                    pass

        holdings.append({
            "instrument_id": f"NSE_{sym}",
            "symbol": sym,
            "sector": SECTOR_MAP.get(sym, "Diversified"),
            "quantity": qty,
            "average_price": round(avg_price, 2),
            "current_price": round(ltp, 2),
            "timestamp": datetime.now(timezone.utc).isoformat()
        })

    if not holdings:
        raise ValueError("Could not parse any valid holdings from the provided CSV. Ensure headers include Instrument/Symbol, Qty, and Avg Cost.")

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
    try:
        if os.path.exists(SESSION_CACHE_FILE):
            os.remove(SESSION_CACHE_FILE)
    except Exception:
        pass
    return {"status": "SUCCESS", "message": "Zerodha session disconnected"}
