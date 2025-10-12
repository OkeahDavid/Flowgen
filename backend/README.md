# Flowgen Backend

A FastAPI-based backend for the Flowgen workflow management system that enables AI agent orchestration, document processing, and multi-agent conversations using AutoGen and OpenAI.

## Features

### 🤖 Agent Management
- **Multi-Agent Workflows**: Create and orchestrate multiple AI agents using AutoGen 0.7+
- **Agent Types**: Support for document search, summarizer, and custom agent types
- **Tool Integration**: Agents can use tools like document search and web search
- **OpenAI Integration**: Seamless integration with OpenAI's GPT models and embeddings

### 📄 Document Processing
- **File Upload**: Support for PDF, DOCX, TXT, and Markdown files
- **Vector Search**: OpenAI embeddings-powered semantic search
- **Document Filtering**: Search specific documents selected by users
- **Chunk-based Storage**: Efficient text chunking for better search results

### 🔧 Workflow Execution
- **Graph-based Workflows**: Define agent connections and execution flow
- **Real-time Messaging**: WebSocket support for live workflow updates
- **Tool Calling**: Agents can execute functions and tools during conversations
- **Result Streaming**: Real-time results and intermediate outputs

## Architecture

### Core Components

```
backend/
├── main.py              # FastAPI application and API routes
├── agents.py            # Agent creation and management
├── tools.py             # Tool definitions for agents
├── document_processor.py # Document upload and vector search
├── storage/             # File and data storage
│   ├── documents/       # Uploaded documents and metadata
│   └── workflows/       # Workflow configurations
└── pyproject.toml       # Dependencies and project config
```

### Key Technologies
- **FastAPI**: Modern async web framework
- **AutoGen 0.7+**: Multi-agent conversation framework
- **OpenAI API**: GPT models and text embeddings
- **scikit-learn**: Cosine similarity for vector search
- **NumPy**: Efficient array operations for embeddings
- **python-multipart**: File upload handling

## API Endpoints

### Document Management
- `POST /documents/upload` - Upload documents for processing
- `GET /documents/info` - List uploaded documents
- `POST /documents/search` - Search documents with filtering

### Workflow Management
- `POST /workflow/create` - Create and execute workflows
- `GET /workflow/{workflow_id}` - Get workflow status and results
- `WebSocket /workflow/{workflow_id}/ws` - Real-time workflow updates

### Agent Operations
- Agent creation with custom configurations
- Tool assignment and management
- Multi-agent conversation orchestration

## Installation & Setup

### Prerequisites
- Python 3.9+
- OpenAI API key

### Installation

1. **Install dependencies using uv** (recommended):
```bash
uv sync
```

2. **Or using pip**:
```bash
pip install -r requirements.txt
```

3. **Set environment variables**:
```bash
export OPENAI_API_KEY="your-openai-api-key"
```

4. **Run the server**:
```bash
uv run main.py
# or
python main.py
```

The server will start on `http://localhost:8000`

## Usage Examples

### 1. Upload Documents
```bash
curl -X POST "http://localhost:8000/documents/upload" \
  -F "files=@document.pdf"
```

### 2. Create a Workflow
```bash
curl -X POST "http://localhost:8000/workflow/create" \
  -H "Content-Type: application/json" \
  -d '{
    "agents": [
      {
        "id": "doc_search",
        "type": "document_search",
        "config": {
          "uploadedFiles": ["document.pdf"]
        }
      },
      {
        "id": "summarizer",
        "type": "summarizer"
      }
    ],
    "connections": [
      {
        "from": "doc_search",
        "to": "summarizer"
      }
    ],
    "task": "What does this document discuss?"
  }'
```

### 3. Search Documents
```bash
curl -X POST "http://localhost:8000/documents/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "key information",
    "filter_documents": ["document.pdf"],
    "max_results": 5
  }'
```

## Configuration

### Environment Variables
- `OPENAI_API_KEY`: Required for OpenAI API access
- `HOST`: Server host (default: 0.0.0.0)
- `PORT`: Server port (default: 8000)

### Document Processing
- **Supported formats**: PDF, DOCX, TXT, MD
- **Chunk size**: 1000 characters with 200 character overlap
- **Embedding model**: text-embedding-ada-002
- **Storage**: JSON files with NumPy arrays for embeddings

## Development

### Project Structure
- **agents.py**: AutoGen agent creation and configuration
- **tools.py**: Function definitions for agent tools
- **document_processor.py**: Document upload, chunking, and search
- **main.py**: FastAPI routes and application setup

### Adding New Agent Types
1. Define the agent configuration in `agents.py`
2. Add any required tools in `tools.py`
3. Update the frontend agent palette

### Adding New Tools
1. Create the tool function in `tools.py`
2. Register it with agents in `agents.py`
3. Update tool descriptions and parameters

## TODO & Future Improvements

### 🗄️ Database Integration (High Priority)
- **Migrate from JSON storage to database**: Replace current JSON file storage with PostgreSQL or similar
- **Embedding storage**: Store document embeddings in vector database (e.g., pgvector, Pinecone, or Weaviate)
- **Performance**: Improve search performance for large document collections
- **Scalability**: Support for concurrent users and larger datasets
- **Metadata management**: Better document metadata and version tracking

### 🚀 Additional Enhancements
- **Authentication**: User management and secure access
- **Document versioning**: Track document changes and updates
- **Batch processing**: Handle multiple document uploads efficiently
- **Caching**: Redis integration for frequently accessed data
- **Monitoring**: Logging and metrics for production deployment
- **Error handling**: Improved error messages and recovery
- **Testing**: Comprehensive test suite for all components

### 🔧 Performance Optimizations
- **Async document processing**: Background task queue for uploads
- **Connection pooling**: Database connection optimization
- **Embedding caching**: Cache frequently used embeddings
- **API rate limiting**: Protect against excessive API usage

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is part of the Flowgen application suite.

---

**Note**: This backend is designed to work with the Flowgen frontend React application. Make sure both services are running for full functionality.