from app.db.database import engine, Base
import app.models.all_models
import app.models.paw_ai_models

def create_all():
    print("Creating tables safely in the database...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully.")

if __name__ == "__main__":
    create_all()
