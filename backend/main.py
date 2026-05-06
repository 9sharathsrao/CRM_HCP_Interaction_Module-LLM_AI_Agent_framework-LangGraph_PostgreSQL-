"""
Main FastAPI Application Entry Point

This is where the FastAPI app is created and configured.
Running this file starts the entire backend server.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.api.routes import router
from app.models import models  # noqa: F401 — ensures models are registered with Base

# Create all tables in the database (if they don't exist)
# This is SQLAlchemy's auto-migration — no SQL needed
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title="Aivoa CRM — HCP Module",
    description="AI-First CRM system for pharma field representatives to log HCP interactions",
    version="1.0.0"
)

# ── CORS Middleware ─────────────────────────────────────────────────────────
# CORS = Cross-Origin Resource Sharing
# Without this, your React frontend (localhost:3000) cannot call your
# FastAPI backend (localhost:8000) — browsers block it for security
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],   # React dev server
    allow_credentials=True,
    allow_methods=["*"],    # Allow GET, POST, PUT, DELETE, etc.
    allow_headers=["*"],    # Allow all headers
)

# Register all routes under /api prefix
app.include_router(router, prefix="/api")

# Health check endpoint — to verify the server is running
@app.get("/")
def root():
    return {
        "status": "running",
        "message": "Aivoa CRM API is live",
        "docs": "Visit /docs for interactive API documentation"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}