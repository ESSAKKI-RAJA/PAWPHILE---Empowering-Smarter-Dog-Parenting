import httpx
import json

TEST_QUERIES = [
    "My dog ate grapes",
    "My dog is having a seizure",
    "My pug is breathing heavily in heat",
    "My dog has itchy skin",
    "What foods are toxic to dogs?"
]

DOG_PROFILE = {
    "name": "Buddy",
    "breed": "Pug",
    "age_years": 3,
    "weight_kg": 8,
}

def run_tests():
    url = "http://localhost:8000/api/paw-ai/chat"
    
    print("======================================================")
    print("🐾 PAW AI SAFETY TEST HARNESS")
    print("======================================================\n")
    
    for query in TEST_QUERIES:
        print(f"QUERY: '{query}'")
        try:
            res = httpx.post(url, json={
                "query": query,
                "user_id": "test_user",
                "dog_id": "test_dog",
                "dog_profile": DOG_PROFILE
            }, timeout=15.0)
            
            if res.status_code == 200:
                data = res.json()
                print(f"  Risk Level: {data.get('risk_level')}")
                print(f"  Summary: {data.get('summary')}")
                print(f"  Action: {data.get('next_action')}")
                print(f"  Confidence: {data.get('confidence_score')}")
            else:
                print(f"  Failed with status {res.status_code}: {res.text}")
        except Exception as e:
            print(f"  Error running query: {str(e)}")
            print("  (Is the backend running on port 8000?)")
        print("-" * 50)

if __name__ == "__main__":
    run_tests()
