"""
Document processing and vector search functionality using OpenAI embeddings.
"""

import os
import io
import json
from typing import List, Dict, Any, Optional
from pathlib import Path
import logging
import hashlib

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from openai import OpenAI
from PyPDF2 import PdfReader
from docx import Document
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DocumentProcessor:
    """Handles document processing and vector search operations using OpenAI embeddings."""
    
    def __init__(self, storage_path: str = "./storage/documents"):
        """Initialize the document processor with OpenAI embeddings."""
        self.storage_path = storage_path
        self.documents_file = os.path.join(storage_path, "documents.json")
        self.embeddings_file = os.path.join(storage_path, "embeddings.npy")
        
        # Ensure storage directory exists
        os.makedirs(storage_path, exist_ok=True)
        
        # Initialize OpenAI client
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        
        self.openai_client = OpenAI(api_key=api_key)
        
        # Load existing documents and embeddings
        self.documents = self._load_documents()
        self.embeddings = self._load_embeddings()
        
        logger.info(f"Initialized document processor with {len(self.documents)} existing documents")
    
    def _load_documents(self) -> List[Dict[str, Any]]:
        """Load documents from JSON file."""
        if os.path.exists(self.documents_file):
            try:
                with open(self.documents_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error loading documents: {e}")
                return []
        return []
    
    def _save_documents(self):
        """Save documents to JSON file."""
        try:
            with open(self.documents_file, 'w', encoding='utf-8') as f:
                json.dump(self.documents, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"Error saving documents: {e}")
    
    def _load_embeddings(self) -> Optional[np.ndarray]:
        """Load embeddings from numpy file."""
        if os.path.exists(self.embeddings_file):
            try:
                return np.load(self.embeddings_file)
            except Exception as e:
                logger.error(f"Error loading embeddings: {e}")
                return None
        return None
    
    def _save_embeddings(self):
        """Save embeddings to numpy file."""
        if len(self.documents) > 0 and self.embeddings is not None:
            try:
                np.save(self.embeddings_file, self.embeddings)
            except Exception as e:
                logger.error(f"Error saving embeddings: {e}")
    
    def _get_openai_embedding(self, text: str) -> List[float]:
        """Get embedding from OpenAI API."""
        try:
            response = self.openai_client.embeddings.create(
                model="text-embedding-ada-002",
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Error getting OpenAI embedding: {e}")
            raise
    
    def extract_text_from_file(self, file_content: bytes, filename: str) -> str:
        """Extract text content from uploaded file."""
        file_extension = Path(filename).suffix.lower()
        
        try:
            if file_extension == '.pdf':
                return self._extract_from_pdf(file_content)
            elif file_extension in ['.docx', '.doc']:
                return self._extract_from_docx(file_content)
            elif file_extension in ['.txt', '.md']:
                return file_content.decode('utf-8')
            else:
                logger.warning(f"Unsupported file type: {file_extension}")
                return file_content.decode('utf-8', errors='ignore')
        except Exception as e:
            logger.error(f"Error extracting text from {filename}: {str(e)}")
            return f"Error extracting text from {filename}: {str(e)}"
    
    def _extract_from_pdf(self, file_content: bytes) -> str:
        """Extract text from PDF file."""
        try:
            pdf_file = io.BytesIO(file_content)
            reader = PdfReader(pdf_file)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            return text.strip()
        except Exception as e:
            logger.error(f"Error extracting PDF: {str(e)}")
            raise
    
    def _extract_from_docx(self, file_content: bytes) -> str:
        """Extract text from DOCX file."""
        try:
            docx_file = io.BytesIO(file_content)
            doc = Document(docx_file)
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            return text.strip()
        except Exception as e:
            logger.error(f"Error extracting DOCX: {str(e)}")
            raise
    
    def chunk_text(self, text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
        """Split text into overlapping chunks for better search results."""
        if not text.strip():
            return []
        
        words = text.split()
        chunks = []
        
        for i in range(0, len(words), chunk_size - overlap):
            chunk = ' '.join(words[i:i + chunk_size])
            if chunk.strip():
                chunks.append(chunk.strip())
        
        return chunks
    
    def generate_file_id(self, filename: str, file_content: bytes) -> str:
        """Generate a unique ID for a file based on its name and content."""
        hasher = hashlib.md5()
        hasher.update(filename.encode('utf-8'))
        hasher.update(file_content)
        return hasher.hexdigest()
    
    def upload_document(self, filename: str, file_content: bytes) -> Dict[str, Any]:
        """Process and store a document with OpenAI embeddings."""
        try:
            # Generate unique file ID
            file_id = self.generate_file_id(filename, file_content)
            
            # Check if document already exists
            existing_doc = next((doc for doc in self.documents if doc["file_id"] == file_id), None)
            if existing_doc:
                logger.info(f"Document {filename} already exists in database")
                return {
                    "success": True,
                    "message": f"Document {filename} already exists in database",
                    "file_id": file_id,
                    "chunks_added": 0
                }
            
            # Extract text from file
            logger.info(f"Extracting text from {filename}")
            text_content = self.extract_text_from_file(file_content, filename)
            
            if not text_content.strip():
                return {
                    "success": False,
                    "message": f"No text content could be extracted from {filename}",
                    "file_id": file_id
                }
            
            # Split text into chunks
            chunks = self.chunk_text(text_content)
            logger.info(f"Split {filename} into {len(chunks)} chunks")
            
            if not chunks:
                return {
                    "success": False,
                    "message": f"No valid text chunks created from {filename}",
                    "file_id": file_id
                }
            
            # Generate embeddings for chunks using OpenAI
            logger.info(f"Generating OpenAI embeddings for {len(chunks)} chunks")
            chunk_embeddings = []
            for i, chunk in enumerate(chunks):
                try:
                    embedding = self._get_openai_embedding(chunk)
                    chunk_embeddings.append(embedding)
                    if (i + 1) % 10 == 0:  # Progress logging
                        logger.info(f"Generated embeddings for {i + 1}/{len(chunks)} chunks")
                except Exception as e:
                    logger.error(f"Error generating embedding for chunk {i}: {e}")
                    return {
                        "success": False,
                        "message": f"Error generating embeddings: {str(e)}",
                        "file_id": file_id
                    }
            
            # Add document chunks to storage
            start_index = len(self.documents)
            for i, (chunk, embedding) in enumerate(zip(chunks, chunk_embeddings)):
                doc_entry = {
                    "id": f"{file_id}_{i}",
                    "filename": filename,
                    "file_id": file_id,
                    "chunk_index": i,
                    "total_chunks": len(chunks),
                    "content": chunk,
                    "text_length": len(chunk)
                }
                self.documents.append(doc_entry)
            
            # Update embeddings array
            if self.embeddings is None:
                self.embeddings = np.array(chunk_embeddings)
            else:
                self.embeddings = np.vstack([self.embeddings, chunk_embeddings])
            
            # Save to disk
            self._save_documents()
            self._save_embeddings()
            
            logger.info(f"Successfully stored {len(chunks)} chunks from {filename}")
            
            return {
                "success": True,
                "message": f"Successfully processed and stored {filename}",
                "file_id": file_id,
                "chunks_added": len(chunks),
                "text_length": len(text_content)
            }
            
        except Exception as e:
            logger.error(f"Error processing document {filename}: {str(e)}")
            return {
                "success": False,
                "message": f"Error processing {filename}: {str(e)}",
                "file_id": file_id if 'file_id' in locals() else None
            }
    
    def search_documents(self, query: str, max_results: int = 5, filter_filenames: List[str] = None) -> List[Dict[str, Any]]:
        """Search for relevant document chunks using OpenAI embeddings and cosine similarity."""
        try:
            # Check if we have any documents
            if len(self.documents) == 0 or self.embeddings is None:
                return []
            
            logger.info(f"Searching documents for query: {query}")
            if filter_filenames:
                logger.info(f"Filtering by documents: {filter_filenames}")
            
            # Filter documents by filenames if specified
            if filter_filenames:
                # Get indices of documents that match the filter
                filtered_indices = []
                for i, doc in enumerate(self.documents):
                    if doc["filename"] in filter_filenames:
                        filtered_indices.append(i)
                
                if not filtered_indices:
                    logger.info(f"No documents found matching filter: {filter_filenames}")
                    return []
                
                # Create filtered embeddings array
                filtered_embeddings = self.embeddings[filtered_indices]
                
                logger.info(f"Filtered to {len(filtered_indices)} chunks from {len(filter_filenames)} documents")
            else:
                filtered_indices = list(range(len(self.documents)))
                filtered_embeddings = self.embeddings
            
            # Generate embedding for query using OpenAI
            query_embedding = self._get_openai_embedding(query)
            query_embedding = np.array(query_embedding).reshape(1, -1)
            
            # Calculate cosine similarity with filtered document embeddings
            similarities = cosine_similarity(query_embedding, filtered_embeddings)[0]
            
            # Get top results
            top_indices = np.argsort(similarities)[::-1][:max_results]
            
            # Format results
            search_results = []
            for local_idx in top_indices:
                if similarities[local_idx] > 0.1:  # Minimum similarity threshold
                    # Map back to original document index
                    doc_idx = filtered_indices[local_idx]
                    doc = self.documents[doc_idx]
                    result = {
                        "content": doc["content"],
                        "filename": doc["filename"],
                        "chunk_index": doc["chunk_index"],
                        "relevance_score": float(similarities[local_idx]),
                        "similarity": float(similarities[local_idx])
                    }
                    search_results.append(result)
            
            logger.info(f"Found {len(search_results)} relevant chunks")
            return search_results
            
        except Exception as e:
            logger.error(f"Error searching documents: {str(e)}")
            return []
    
    def get_document_info(self) -> Dict[str, Any]:
        """Get information about stored documents."""
        try:
            if len(self.documents) == 0:
                return {
                    "total_chunks": 0,
                    "total_documents": 0,
                    "documents": []
                }
            
            # Count unique files
            unique_files = set()
            document_info = {}
            
            for doc in self.documents:
                filename = doc['filename']
                file_id = doc['file_id']
                unique_files.add(file_id)
                
                if file_id not in document_info:
                    document_info[file_id] = {
                        "filename": filename,
                        "chunk_count": 0
                    }
                document_info[file_id]["chunk_count"] += 1
            
            return {
                "total_chunks": len(self.documents),
                "total_documents": len(unique_files),
                "documents": list(document_info.values())
            }
            
        except Exception as e:
            logger.error(f"Error getting document info: {str(e)}")
            return {
                "total_chunks": 0,
                "total_documents": 0,
                "documents": [],
                "error": str(e)
            }
    
    def clear_all_documents(self) -> bool:
        """Clear all documents from storage."""
        try:
            # Clear in-memory data
            self.documents = []
            self.embeddings = None
            
            # Remove files
            if os.path.exists(self.documents_file):
                os.remove(self.documents_file)
            if os.path.exists(self.embeddings_file):
                os.remove(self.embeddings_file)
            
            logger.info("Cleared all documents from storage")
            return True
        except Exception as e:
            logger.error(f"Error clearing documents: {str(e)}")
            return False

# Global instance - will be initialized after environment is loaded
document_processor = None

def get_document_processor():
    """Get or create the global document processor instance."""
    global document_processor
    if document_processor is None:
        # Load environment variables
        load_dotenv()
        document_processor = DocumentProcessor()
    return document_processor