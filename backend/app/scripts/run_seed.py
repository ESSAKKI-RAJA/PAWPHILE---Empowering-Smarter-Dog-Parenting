from app.db.database import SessionLocal
from app.scripts.seed_breeds import seed_to_db

def run_seed():
    print("Starting breed seed...")
    db = SessionLocal()
    try:
        seed_to_db(db)
    finally:
        db.close()

if __name__ == "__main__":
    run_seed()
