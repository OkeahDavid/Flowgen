"""Quick test to verify database connection and basic operations."""
import sys
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from database import SessionLocal, engine
from db_service import DocumentService, WorkflowService
from sqlalchemy import text


def test_connection():
    """Test database connection."""
    print("Testing database connection...")
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version()"))
            version = result.fetchone()[0]
            print(f"✓ Connected to PostgreSQL: {version[:50]}...")
            return True
    except Exception as e:
        print(f"✗ Connection failed: {e}")
        return False


def test_pgvector():
    """Test pgvector extension."""
    print("\nTesting pgvector extension...")
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT * FROM pg_extension WHERE extname = 'vector'"))
            if result.fetchone():
                print("✓ pgvector extension is installed")
                return True
            else:
                print("✗ pgvector extension not found")
                return False
    except Exception as e:
        print(f"✗ Error checking pgvector: {e}")
        return False


def test_tables():
    """Test that all tables exist."""
    print("\nTesting tables...")
    try:
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            """))
            tables = [row[0] for row in result]
            expected = ['documents', 'workflows', 'workflow_executions']
            
            for table in expected:
                if table in tables:
                    print(f"✓ Table '{table}' exists")
                else:
                    print(f"✗ Table '{table}' missing")
                    return False
            return True
    except Exception as e:
        print(f"✗ Error checking tables: {e}")
        return False


def test_crud_operations():
    """Test basic CRUD operations."""
    print("\nTesting CRUD operations...")
    db = SessionLocal()
    
    try:
        # Create a test document
        print("  Creating test document...")
        doc = DocumentService.create_document(
            db=db,
            filename="test.txt",
            content="This is a test document",
            content_type="txt",
            file_size=100
        )
        print(f"  ✓ Created document with ID: {doc.id}")
        
        # Read the document
        print("  Reading document...")
        retrieved = DocumentService.get_document(db=db, doc_id=doc.id)
        if retrieved and retrieved.filename == "test.txt":
            print(f"  ✓ Successfully retrieved document")
        else:
            print(f"  ✗ Failed to retrieve document")
            return False
        
        # Create a test workflow
        print("  Creating test workflow...")
        workflow = WorkflowService.create_workflow(
            db=db,
            name="Test Workflow",
            description="A test workflow",
            workflow_data={"nodes": [], "edges": []},
            tags=["test"]
        )
        print(f"  ✓ Created workflow with ID: {workflow.id}")
        
        # Clean up
        print("  Cleaning up test data...")
        DocumentService.delete_document(db=db, doc_id=doc.id)
        WorkflowService.delete_workflow(db=db, workflow_id=workflow.id)
        print("  ✓ Test data cleaned up")
        
        return True
        
    except Exception as e:
        print(f"  ✗ CRUD operations failed: {e}")
        return False
    finally:
        db.close()


def main():
    """Run all tests."""
    print("=" * 60)
    print("Database Connection Test")
    print("=" * 60)
    
    tests = [
        ("Database Connection", test_connection),
        ("pgvector Extension", test_pgvector),
        ("Tables", test_tables),
        ("CRUD Operations", test_crud_operations),
    ]
    
    results = []
    for name, test_func in tests:
        result = test_func()
        results.append((name, result))
    
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status} - {name}")
    
    print("\n" + "=" * 60)
    if passed == total:
        print(f"✓ All tests passed ({passed}/{total})")
        print("=" * 60)
        sys.exit(0)
    else:
        print(f"✗ Some tests failed ({passed}/{total})")
        print("=" * 60)
        sys.exit(1)


if __name__ == "__main__":
    main()
