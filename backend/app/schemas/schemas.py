from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# ── HCP Schemas ──────────────────────────────────────────────

class HCPCreate(BaseModel):
    name: str
    specialty: Optional[str] = None
    hospital: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None

class HCPResponse(HCPCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True   # allows reading SQLAlchemy models


# ── Interaction Schemas ───────────────────────────────────────

class InteractionCreate(BaseModel):
    hcp_id: int
    interaction_type: Optional[str] = "Meeting"
    interaction_date: Optional[str] = None
    interaction_time: Optional[str] = None
    attendees: Optional[str] = None
    topics_discussed: Optional[str] = None
    materials_shared: Optional[str] = None
    samples_distributed: Optional[str] = None
    sentiment: Optional[str] = "neutral"
    outcomes: Optional[str] = None
    follow_up_actions: Optional[str] = None
    ai_suggested_followups: Optional[str] = None
    raw_chat_input: Optional[str] = None

class InteractionUpdate(BaseModel):
    interaction_type: Optional[str] = None
    interaction_date: Optional[str] = None
    interaction_time: Optional[str] = None
    attendees: Optional[str] = None
    topics_discussed: Optional[str] = None
    materials_shared: Optional[str] = None
    samples_distributed: Optional[str] = None
    sentiment: Optional[str] = None
    outcomes: Optional[str] = None
    follow_up_actions: Optional[str] = None
    ai_suggested_followups: Optional[str] = None

class InteractionResponse(InteractionCreate):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Chat Schema ───────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str                          # what the user typed in the chat box
    hcp_id: Optional[int] = None          # which HCP they're logging for

class ChatResponse(BaseModel):
    reply: str                            # AI's reply text
    extracted_data: Optional[dict] = None # structured data pulled from the message
    interaction_id: Optional[int] = None  # ID if interaction was saved