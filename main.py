from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import requests, hmac, hashlib, time, threading, json, os

app = FastAPI(title="Victory Bot")

API_KEY = os.getenv("COINBASE_API_KEY")
API_SECRET = os.getenv("COINBASE_API_SECRET")
API_PASSPHRASE = os.getenv("COINBASE_API_PASSPHRASE")
BASE_URL = "https://api.exchange.coinbase.com"
SYMBOL = "BTC-USD"
AMOUNT = 0.001

class BotStatus(BaseModel):
    running: bool = False
    last_action: str = "None"
    profit: float = 0.0
    trades: list = []
    logs: list = []

status = BotStatus()

def get_headers(method, path, body=""):
    timestamp = str(time.time())
    message = timestamp + method + path + body
    signature = hmac.new(API_SECRET.encode(), message.encode(), hashlib.sha256).digest()
    signature_b64 = hashlib.sha256(signature).hexdigest()
    return {
        "CB-ACCESS-KEY": API_KEY,
        "CB-ACCESS-SIGN": signature_b64,
        "CB-ACCESS-TIMESTAMP": timestamp,
        "CB-ACCESS-PASSPHRASE": API_PASSPHRASE,
        "Content-Type": "application/json"
    }

def get_price():
    response = requests.get(f"{BASE_URL}/products/{SYMBOL}/ticker")
    response.raise_for_status()
    return float(response.json()["price"])

def place_order(side):
    path = "/orders"
    body = json.dumps({
        "type": "market",
        "side": side,
        "product_id": SYMBOL,
        "size": AMOUNT
    })
    headers = get_headers("POST", path, body=body)
    response = requests.post(f"{BASE_URL}{path}", data=body, headers=headers)
    response.raise_for_status()
    return response.json()

def trade_loop():
    last_price = get_price()
    while status.running:
        try:
            current_price = get_price()
            change = (current_price - last_price) / last_price
            if change > 0.01:
                place_order("sell")
                status.last_action = f"Sold at ${current_price}"
                status.profit += AMOUNT * current_price
            elif change < -0.01:
                place_order("buy")
                status.last_action = f"Bought at ${current_price}"
                status.profit -= AMOUNT * current_price
            else:
                status.last_action = "HOLD"
            status.trades.append({
                "price": current_price,
                "change": round(change * 100, 2),
                "action": status.last_action
            })
            time.sleep(30)
            last_price = current_price
        except Exception as e:
            status.logs.append(str(e))
            time.sleep(60)

@app.post("/start")
def start():
    if status.running:
        raise HTTPException(400, "Bot already running")
    status.running = True
    threading.Thread(target=trade_loop, daemon=True).start()
    return {"message": "Victory Bot started"}

@app.post("/stop")
def stop():
    if not status.running:
        raise HTTPException(400, "Bot not running")
    status.running = False
    return {"message": "Victory Bot stopped"}

@app.get("/status")
def get_status():
    return status
