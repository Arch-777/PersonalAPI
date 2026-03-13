Create a **new Markdown documentation file** that reshapes and extends the current **PersonalAPI project architecture**.

You must **refer to the provided development guide `.md` file** and expand the system architecture while keeping the existing stack and philosophy intact.

The documentation should contain a **complete development flow and implementation guide**.

---

# Project Goal

Build a **Personal Data API platform** that aggregates data from multiple services and allows users to query their personal data through:

* a **dashboard**
* a **chatbot interface**
* a **portable messaging interface (Telegram / WhatsApp)**

The system should continuously collect, normalize, vectorize, and index user data for **semantic search and RAG-based responses**.

---

# Tech Stack

Frontend

* **Next.js**

Backend

* **Python**
* **FastAPI**
* **Celery**
* **PostgreSQL with pgvector**
* **Redis**
* **WebSockets**

Security / Auth

* OAuth integrations
* token-based service connections
* SHA256 hashing
* encrypted credential storage

---

# Data Sources to Integrate

The system must support connectors for the following services:

### WhatsApp

Data fetched into:

```
/userID/data/whatsapp/
```

### Google Services

```
/userID/data/google/
    /drive
    /photos
    /other_google_services
```

### Notion

```
/userID/data/notion/
```

Each page, note, or document should be stored as individual files.

### Spotify

```
/userID/data/spotify/
```

### Other Services

Additional services should automatically follow the pattern:

```
/userID/data/{service_name}/
```

---

# Worker Architecture

Celery workers should be designed as **independent service ingestion jobs**.

Example workers:

```
workers/
    whatsapp_worker.py
    google_worker.py
    notion_worker.py
    spotify_worker.py
```

Responsibilities of workers:

1. Connect to external APIs using **OAuth or tokens**
2. Fetch user data periodically
3. Normalize the data
4. Store the results in the user's **data folder**
5. Send update events to the backend

---

# Folder Structure

Each user should have a unique folder.

```
/users/{userID}/
        /data/
            /whatsapp
            /google
                /drive
                /photos
            /notion
            /spotify
```

User folder name should be the **UserID**.

---

# Real-Time Updates

Implement **WebSocket services** that monitor the data directories.

When new data is added to:

```
/users/{userID}/data/*
```

The system should:

1. trigger indexing
2. notify the dashboard
3. update the RAG system

---

# RAG System Design

Create a **custom Retrieval-Augmented Generation system**.

The RAG pipeline should:

1. read data from

```
/users/{userID}/data/
```

2. process the data
3. generate embeddings
4. store vectors in:

```
PostgreSQL (pgvector)
```

Use:

* **vector embeddings**
* **page indexing**
* **document chunking**

The system should continuously train/index new data.

---

# MCP Integration

Add support for **MCP connection** to allow tool-based access to the RAG system.

Tools should include:

* fetch_user_documents
* search_user_vectors
* retrieve_file_links
* retrieve_conversation_history

---

# Chatbot Layer

The RAG system should connect to a chatbot.

Capabilities:

* answer user questions about their data
* retrieve documents
* return links to files
* provide contextual summaries

The chatbot should appear inside the **dashboard**.

---

# Dashboard Features

The web dashboard should allow users to:

### Authentication

Users can login using:

* Google OAuth
* Email + Password

---

### Service Connections

Users can connect services by adding:

* OAuth credentials
* API tokens

Supported connectors:

* WhatsApp
* Google
* Notion
* Spotify

---

### Data Processing

Users can:

* trigger vector creation
* sync services
* manage connectors

---

### Data Querying

Users can query their data through:

* semantic search
* chatbot interface

All queries should use the **pgvector indexed database**.

---

# External Agent Integration

The system must support an external tool called **OpenClaw**.

OpenClaw should act as a **portable user interface**.

It can connect to:

* Telegram
* WhatsApp

Users can query their PersonalAPI through OpenClaw.

---

# OpenClaw Authentication

The dashboard should allow users to generate a **token for OpenClaw**.

Flow:

```
Dashboard
    ↓
Generate OpenClaw Token
    ↓
OpenClaw uses token
    ↓
Connects to PersonalAPI
    ↓
User can ask questions through Telegram / WhatsApp
```

Responses should include:

* text answers
* document links
* file references

---

# Security Requirements

The system must include:

* SHA256 hashing for API keys
* encrypted OAuth tokens
* secure connector storage
* user data isolation
* role-based access

---

# Implementation Guide Requirements

The output document must include:

### 1. System Architecture

* overall architecture diagram
* service interaction

### 2. Backend Implementation

* FastAPI structure
* Celery worker architecture
* RAG pipeline
* vector indexing

### 3. Frontend Implementation

* Next.js dashboard architecture
* service connection UI
* chatbot UI

### 4. Data Flow

Explain how data flows from:

```
External Service
      ↓
Celery Worker
      ↓
User Data Folder
      ↓
Embedding Pipeline
      ↓
pgvector
      ↓
RAG
      ↓
Chatbot
```

### 5. Deployment Architecture

Include:

* Docker services
* Redis
* Postgres
* Workers
* API

### 6. Future Scalability

Explain how the system can scale with:

* more connectors
* large user datasets
* distributed workers

---

# Output Requirements

Generate a **complete Markdown development documents(multiple files max 3)** that includes:

* architecture
* system design
* implementation steps
* backend structure
* frontend structure
* RAG architecture
* security
* deployment


