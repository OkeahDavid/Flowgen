"""Database initialization and management script."""
import sys
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from database import engine, init_db, Base
from models import Document, Workflow, WorkflowExecution
from sqlalchemy import text


def create_pgvector_extension():
    """Create the pgvector extension if it doesn't exist."""
    print("Creating pgvector extension...")
    try:
        with engine.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            conn.commit()
            print("✓ pgvector extension created successfully")
    except Exception as e:
        print(f"✗ Error creating pgvector extension: {e}")
        print("  Note: You may need database superuser privileges to create extensions")
        raise


def create_tables():
    """Create all database tables."""
    print("\nCreating database tables...")
    try:
        Base.metadata.create_all(bind=engine)
        print("✓ All tables created successfully:")
        print(f"  - {Document.__tablename__}")
        print(f"  - {Workflow.__tablename__}")
        print(f"  - {WorkflowExecution.__tablename__}")
    except Exception as e:
        print(f"✗ Error creating tables: {e}")
        raise


def verify_tables():
    """Verify that all tables were created."""
    print("\nVerifying tables...")
    try:
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            """))
            tables = [row[0] for row in result]
            print(f"✓ Found {len(tables)} tables in database:")
            for table in tables:
                print(f"  - {table}")
    except Exception as e:
        print(f"✗ Error verifying tables: {e}")


def reset_database():
    """Drop all tables and recreate them (USE WITH CAUTION)."""
    print("\n⚠️  WARNING: This will delete all data!")
    response = input("Are you sure you want to reset the database? (yes/no): ")
    
    if response.lower() == "yes":
        print("\nDropping all tables...")
        try:
            Base.metadata.drop_all(bind=engine)
            print("✓ All tables dropped")
            create_tables()
        except Exception as e:
            print(f"✗ Error resetting database: {e}")
            raise
    else:
        print("Database reset cancelled")


def main():
    """Main initialization function."""
    print("=" * 60)
    print("Database Initialization Script")
    print("=" * 60)
    
    try:
        # Create pgvector extension
        create_pgvector_extension()
        
        # Create tables
        create_tables()
        
        # Verify tables
        verify_tables()
        
        print("\n" + "=" * 60)
        print("✓ Database initialization completed successfully!")
        print("=" * 60)
        
    except Exception as e:
        print("\n" + "=" * 60)
        print(f"✗ Database initialization failed: {e}")
        print("=" * 60)
        sys.exit(1)


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Database initialization and management")
    parser.add_argument(
        "--reset", 
        action="store_true", 
        help="Reset the database (drops and recreates all tables)"
    )
    
    args = parser.parse_args()
    
    if args.reset:
        reset_database()
    else:
        main()
