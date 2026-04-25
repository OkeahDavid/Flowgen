# Flowgen - AI Agent Workflow Builder

A drag-and-drop interface for building and executing AI agent workflows using Microsoft Agent Framework.

## Features

- **Intuitive Drag & Drop Interface**: Build workflows by dragging agents onto a canvas
- **Four Agent Types**: Web Search, Document Search, Summarizer, and Creative Writer agents
- **Visual Workflow Design**: Connect agents with visual connections
- **Real-time Execution**: Execute workflows and see results in real-time
- **Agent Framework Integration**: Powered by Microsoft's Agent Framework for typed workflow orchestration
- **PostgreSQL Database**: Persistent storage for workflows, executions, and documents
- **Material UI Design**: Clean, modern interface built with React and Material UI
<img width="1914" height="900" alt="image" src="https://github.com/user-attachments/assets/78e0ee4f-af54-413f-b3ee-d9dec6a6bef6" />

## Tech Stack

### Backend
- **Python** with **uv** for dependency management
- **FastAPI** for REST API
- **Microsoft Agent Framework 1.2+** for workflow orchestration
- **OpenAI API** for LLM integration

### Frontend
- **React** with **Vite** and **TypeScript**
- **Material UI** for components
- **@dnd-kit** for drag-and-drop functionality
- **Axios** for API communication

## Setup Instructions

### Prerequisites
- Python 3.11+
- Node.js 18+
- OpenAI API key
- PostgreSQL 14+ (with pgvector extension)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies with uv:
   ```bash
   uv sync
   ```

3. Set up environment variables:
   - Copy the `.env` file in the root directory
   - Replace `your_openai_api_key_here` with your actual OpenAI API key
   - Set `DATABASE_URL` to your PostgreSQL connection string

4. Initialize the database:
   ```bash
   uv run init_db.py
   ```

5. Run the backend server:
   ```bash
   uv run main.py
   ```

The backend will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will be available at `http://localhost:5173`

## Usage

1. **Start both servers** (backend and frontend)

2. **Open the application** in your browser at `http://localhost:5173`

3. **Build your workflow**:
   - Drag agents from the palette on the left to the canvas
   - Click on agents to configure their settings
   - Connect agents by using the "Connect" option in the agent menu
   - Arrange agents in the desired execution order

4. **Execute the workflow**:
   - Click "Execute Workflow" in the top bar
   - Enter a task description when prompted
   - Monitor results in the right panel

## Agent Types

### Web Search Agent
- **Purpose**: Searches the web for information related to queries
- **Use Case**: Finding current information, news, or general web content

### Document Search Agent  
- **Purpose**: Searches through documents and extracts relevant information
- **Use Case**: Analyzing existing documents, PDFs, or text files

### Summarizer Agent
- **Purpose**: Creates concise summaries of provided information
- **Use Case**: Condensing information from other agents or external sources


## Development

### Backend Development
```bash
cd backend
uv run main.py
```

### Frontend Development
```bash
cd frontend
npm run dev
```

### Building for Production

#### Backend
```bash
cd backend
uv build
```

#### Frontend
```bash
cd frontend
npm run build
```


## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- **Microsoft Agent Framework** for the agent framework
- **Material UI** for the component library
- **@dnd-kit** for drag-and-drop functionality
