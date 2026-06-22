from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from app.core.config import settings

DATABASE_URL = settings.DATABASE_URL
# When using async pg, need async engine, but using sync psycopg2 here for simplicity based on requirements.
# If URL starts with postgresql://, psycopg2 works out of the box.

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
