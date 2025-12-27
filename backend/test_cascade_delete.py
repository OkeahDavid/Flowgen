"""
Test script to verify cascade deletion behavior.
"""
import uuid
from datetime import datetime
from database import SessionLocal
from models import Document, Workflow, WorkflowExecution

def test_workflow_cascade_delete():
    """Test that deleting a workflow also deletes its executions."""
    
    db = SessionLocal()
    try:
        # Create a test workflow
        workflow = Workflow(
            id=uuid.uuid4(),
            name="Test Workflow",
            description="Test workflow for cascade delete",
            workflow_data={
                "nodes": [],
                "edges": [],
                "config": {"workflow_type": "sequential"}
            }
        )
        db.add(workflow)
        db.commit()
        print(f"✓ Created workflow: {workflow.id}")
        
        # Create multiple executions for this workflow
        execution_ids = []
        for i in range(3):
            execution = WorkflowExecution(
                id=uuid.uuid4(),
                workflow_id=workflow.id,
                status="completed",
                started_at=datetime.utcnow(),
                completed_at=datetime.utcnow(),
                execution_time=1.5,
                output_data={"result": f"Test result {i}"}
            )
            db.add(execution)
            execution_ids.append(execution.id)
        
        db.commit()
        print(f"✓ Created {len(execution_ids)} executions for workflow")
        
        # Verify executions exist
        count_before = db.query(WorkflowExecution).filter(
            WorkflowExecution.workflow_id == workflow.id
        ).count()
        print(f"✓ Verified {count_before} executions exist before delete")
        
        # Delete the workflow
        workflow_id = workflow.id
        db.delete(workflow)
        db.commit()
        print(f"✓ Deleted workflow: {workflow_id}")
        
        # Verify executions are also deleted (CASCADE)
        count_after = db.query(WorkflowExecution).filter(
            WorkflowExecution.workflow_id == workflow_id
        ).count()
        
        if count_after == 0:
            print("✅ CASCADE DELETE WORKS: All executions were automatically deleted!")
        else:
            print(f"❌ CASCADE DELETE FAILED: {count_after} executions still exist")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()


def test_document_cascade_delete():
    """Test that deleting a parent document also deletes its chunks."""
    print("\n🧪 Testing Document Cascade Delete...")
    
    db = SessionLocal()
    try:
        # Create a parent document
        parent_doc = Document(
            id=uuid.uuid4(),
            filename="test_parent.txt",
            content="Parent document content",
            content_type="txt",
            file_size=len("Parent document content"),
            metadata={"type": "parent"},
            embedding=[0.1] * 1536,  # Mock embedding
            parent_doc_id=None
        )
        db.add(parent_doc)
        db.commit()
        print(f"✓ Created parent document: {parent_doc.id}")
        
        # Create multiple chunk documents
        chunk_ids = []
        for i in range(3):
            chunk = Document(
                id=uuid.uuid4(),
                filename=f"test_parent.txt_chunk_{i}",
                content=f"Chunk {i} content",
                content_type="txt",
                file_size=len(f"Chunk {i} content"),
                doc_metadata={"chunk_index": i, "parent_id": str(parent_doc.id)},
                embedding=[0.1 + i * 0.1] * 1536,
                parent_doc_id=parent_doc.id
            )
            db.add(chunk)
            chunk_ids.append(chunk.id)
        
        db.commit()
        print(f"✓ Created {len(chunk_ids)} chunk documents")
        
        # Verify chunks exist
        count_before = db.query(Document).filter(
            Document.parent_doc_id == parent_doc.id
        ).count()
        print(f"✓ Verified {count_before} chunks exist before delete")
        
        # Delete the parent document
        parent_id = parent_doc.id
        db.delete(parent_doc)
        db.commit()
        print(f"✓ Deleted parent document: {parent_id}")
        
        # Verify chunks are also deleted (CASCADE)
        count_after = db.query(Document).filter(
            Document.parent_doc_id == parent_id
        ).count()
        
        if count_after == 0:
            print("✅ CASCADE DELETE WORKS: All document chunks were automatically deleted!")
        else:
            print(f"❌ CASCADE DELETE FAILED: {count_after} chunks still exist")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()


def test_document_embedding_cleanup():
    """Test that deleting a document also removes its embedding."""
    print("\n🧪 Testing Document Embedding Cleanup...")
    
    db = SessionLocal()
    try:
        # Create a document with embedding
        doc = Document(
            id=uuid.uuid4(),
            filename="test_embedding.txt",
            content="Test content with embedding",
            content_type="txt",
            file_size=len("Test content with embedding"),
            doc_metadata={"test": True},
            embedding=[0.5] * 1536
        )
        db.add(doc)
        db.commit()
        doc_id = doc.id
        print(f"✓ Created document with embedding: {doc_id}")
        
        # Verify document and embedding exist
        doc_check = db.query(Document).filter(Document.id == doc_id).first()
        if doc_check and doc_check.embedding is not None:
            print(f"✓ Document has embedding vector (dimension: {len(doc_check.embedding)})")
        
        # Delete the document
        db.delete(doc)
        db.commit()
        print(f"✓ Deleted document: {doc_id}")
        
        # Verify document is gone
        doc_after = db.query(Document).filter(Document.id == doc_id).first()
        
        if doc_after is None:
            print("✅ CLEANUP WORKS: Document and its embedding are completely removed!")
        else:
            print(f"❌ CLEANUP FAILED: Document still exists")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 60)
    print("CASCADE DELETE TESTS")
    print("=" * 60)
    
    test_workflow_cascade_delete()
    test_document_cascade_delete()
    test_document_embedding_cleanup()
    
    print("\n" + "=" * 60)
    print("ALL TESTS COMPLETED")
    print("=" * 60)
