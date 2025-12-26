"""Test document upload to database."""
import sys
from pathlib import Path
import os
from dotenv import load_dotenv

# Add backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Load environment variables
load_dotenv()

from document_processor import DocumentProcessor
from database import SessionLocal
from models import Document as DocModel

def test_document_upload():
    """Test uploading a document to the database."""
    print("=" * 60)
    print("Testing Document Upload to Database")
    print("=" * 60)
    
    # Create document processor with database enabled
    processor = DocumentProcessor(use_database=True)
    
    # Create a test document
    test_content = b"This is a test document for verifying database integration. It contains sample text about artificial intelligence and machine learning."
    test_filename = "test_integration.txt"
    
    print(f"\n1. Uploading test document: {test_filename}")
    result = processor.upload_document(test_filename, test_content)
    
    if result['success']:
        print(f"   ✓ Upload successful!")
        print(f"   - File ID: {result['file_id']}")
        print(f"   - Chunks added: {result['chunks_added']}")
        if 'text_length' in result:
            print(f"   - Text length: {result['text_length']}")
    else:
        print(f"   ✗ Upload failed: {result['message']}")
        return False
    
    # Verify document is in database
    print(f"\n2. Verifying document in database...")
    db = SessionLocal()
    try:
        docs = db.query(DocModel).filter(DocModel.filename == test_filename).all()
        print(f"   ✓ Found {len(docs)} chunk(s) in database")
        
        for doc in docs:
            print(f"   - Chunk {doc.chunk_index}/{doc.total_chunks}")
            print(f"     Content: {doc.content[:50]}...")
            print(f"     Has embedding: {doc.embedding is not None}")
            if doc.embedding is not None:
                print(f"     Embedding dimensions: {len(doc.embedding)}")
        
        # Test search
        print(f"\n3. Testing semantic search...")
        search_query = "artificial intelligence"
        search_results = processor.search_documents(search_query, max_results=3)
        
        print(f"   Query: '{search_query}'")
        print(f"   ✓ Found {len(search_results)} relevant chunks")
        
        for i, result in enumerate(search_results, 1):
            print(f"   {i}. {result['filename']} (similarity: {result['similarity']:.3f})")
            print(f"      {result['content'][:80]}...")
        
        # Clean up test data
        print(f"\n4. Cleaning up test data...")
        for doc in docs:
            db.delete(doc)
        db.commit()
        print(f"   ✓ Removed {len(docs)} test document(s)")
        
        return True
        
    finally:
        db.close()

def main():
    try:
        success = test_document_upload()
        
        print("\n" + "=" * 60)
        if success:
            print("✓ Integration test passed!")
        else:
            print("✗ Integration test failed!")
        print("=" * 60)
        
        sys.exit(0 if success else 1)
        
    except Exception as e:
        print(f"\n✗ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
