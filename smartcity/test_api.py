import requests
import json

BASE_URL = "http://localhost:5000/api"

endpoints = [
    "dashboard",
    "capteurs",
    "interventions",
    "mesures",
    "citoyens",
    "vehicules",
    "rapport",
    "suggestions"
]

def test_api():
    print(f"Testing API at {BASE_URL}...")
    for ep in endpoints:
        try:
            r = requests.get(f"{BASE_URL}/{ep}", timeout=5)
            print(f"[GET] {ep}: {r.status_code}")
            if r.status_code == 200:
                try:
                    data = r.json()
                    print(f"   Success! Keys: {list(data.keys())}")
                except:
                    print(f"   Failed to parse JSON: {r.text[:100]}")
            else:
                print(f"   Error: {r.text[:200]}")
        except Exception as e:
            print(f"[GET] {ep}: FAILED ({e})")

    # Test Compiler
    try:
        r = requests.post(f"{BASE_URL}/compiler", json={"query": "affiche les capteurs"}, timeout=5)
        print(f"[POST] compiler: {r.status_code}")
        if r.status_code == 200:
            print(f"   Success! SQL: {r.json().get('sql')}")
        else:
            print(f"   Error: {r.text[:200]}")
    except Exception as e:
        print(f"[POST] compiler: FAILED ({e})")

if __name__ == "__main__":
    test_api()
