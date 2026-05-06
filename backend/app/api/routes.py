"""
API Routes — these are the URLs your frontend will call.

HCP Routes:
  POST   /api/hcps/              → Create a new HCP
  GET    /api/hcps/              → Get all HCPs
  GET    /api/hcps/{id}          → Get one HCP

Interaction Routes:
  POST   /api/interactions/      → Log an interaction (from form)
  GET    /api/interactions/      → Get all interactions
  GET    /api/interactions/{id}  → Get one interaction
  PUT    /api/interactions/{id}  → Update an interaction
  DELETE /api/interactions/{id}  → Delete an interaction

Chat Route:
  POST   /api/chat/              → Send message to AI agent
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import json

from app.database import get_db
from app.models.models import HCP, Interaction, SentimentEnum
from app.schemas.schemas import (
    HCPCreate, HCPResponse,
    InteractionCreate, InteractionUpdate, InteractionResponse,
    ChatRequest, ChatResponse
)
from app.agent.crm_agent import crm_agent, suggest_followups, run_chat_directly
from langchain_core.messages import HumanMessage

router = APIRouter()


# ════════════════════════════════════════════════════════════
#  HCP ENDPOINTS
# ════════════════════════════════════════════════════════════

@router.post("/hcps/", response_model=HCPResponse)
def create_hcp(hcp: HCPCreate, db: Session = Depends(get_db)):
    """Create a new Healthcare Professional record"""
    db_hcp = HCP(**hcp.model_dump())
    db.add(db_hcp)
    db.commit()
    db.refresh(db_hcp)
    return db_hcp


@router.get("/hcps/", response_model=List[HCPResponse])
def get_all_hcps(db: Session = Depends(get_db)):
    """Fetch all HCPs — used to populate the HCP dropdown in the form"""
    return db.query(HCP).all()


@router.get("/hcps/{hcp_id}", response_model=HCPResponse)
def get_hcp(hcp_id: int, db: Session = Depends(get_db)):
    """Fetch a single HCP by ID"""
    hcp = db.query(HCP).filter(HCP.id == hcp_id).first()
    if not hcp:
        raise HTTPException(status_code=404, detail="HCP not found")
    return hcp


@router.get("/hcps/search/{name}")
def search_hcp_by_name(name: str, db: Session = Depends(get_db)):
    """Search HCPs by name — used by the agent's fetch_hcp_details tool"""
    hcps = db.query(HCP).filter(HCP.name.ilike(f"%{name}%")).all()
    if not hcps:
        return {"found": False, "message": f"No HCP found with name containing '{name}'"}
    return {"found": True, "hcps": [{"id": h.id, "name": h.name, "specialty": h.specialty} for h in hcps]}


# ════════════════════════════════════════════════════════════
#  INTERACTION ENDPOINTS
# ════════════════════════════════════════════════════════════

@router.post("/interactions/", response_model=InteractionResponse)
def create_interaction(interaction: InteractionCreate, db: Session = Depends(get_db)):
    """
    Log a new interaction — called when user submits the structured form.
    Also called internally after AI chat extracts data.
    """
    # Verify the HCP exists
    hcp = db.query(HCP).filter(HCP.id == interaction.hcp_id).first()
    if not hcp:
        raise HTTPException(status_code=404, detail="HCP not found")

    # Map sentiment string to enum
    sentiment_map = {
        "positive": SentimentEnum.positive,
        "neutral": SentimentEnum.neutral,
        "negative": SentimentEnum.negative
    }

    data = interaction.model_dump()
    data["sentiment"] = sentiment_map.get(data.get("sentiment", "neutral"), SentimentEnum.neutral)

    db_interaction = Interaction(**data)
    db.add(db_interaction)
    db.commit()
    db.refresh(db_interaction)
    return db_interaction


@router.get("/interactions/", response_model=List[InteractionResponse])
def get_all_interactions(db: Session = Depends(get_db)):
    """Fetch all logged interactions"""
    return db.query(Interaction).order_by(Interaction.created_at.desc()).all()


@router.get("/interactions/{interaction_id}", response_model=InteractionResponse)
def get_interaction(interaction_id: int, db: Session = Depends(get_db)):
    """Fetch a single interaction by ID"""
    interaction = db.query(Interaction).filter(Interaction.id == interaction_id).first()
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    return interaction


@router.put("/interactions/{interaction_id}", response_model=InteractionResponse)
def update_interaction(
    interaction_id: int,
    update_data: InteractionUpdate,
    db: Session = Depends(get_db)
):
    """
    Update a logged interaction — used by the Edit Interaction tool.
    Only updates fields that are provided (partial update).
    """
    interaction = db.query(Interaction).filter(Interaction.id == interaction_id).first()
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")

    update_dict = update_data.model_dump(exclude_none=True)  # skip None fields

    # Handle sentiment enum
    if "sentiment" in update_dict:
        sentiment_map = {
            "positive": SentimentEnum.positive,
            "neutral": SentimentEnum.neutral,
            "negative": SentimentEnum.negative
        }
        update_dict["sentiment"] = sentiment_map.get(update_dict["sentiment"], SentimentEnum.neutral)

    for field, value in update_dict.items():
        setattr(interaction, field, value)

    db.commit()
    db.refresh(interaction)
    return interaction


@router.delete("/interactions/{interaction_id}")
def delete_interaction(interaction_id: int, db: Session = Depends(get_db)):
    """Delete an interaction"""
    interaction = db.query(Interaction).filter(Interaction.id == interaction_id).first()
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    db.delete(interaction)
    db.commit()
    return {"message": f"Interaction {interaction_id} deleted successfully"}


# ════════════════════════════════════════════════════════════
#  CHAT / AI AGENT ENDPOINT
# ════════════════════════════════════════════════════════════

@router.post("/chat/", response_model=ChatResponse)
async def chat_with_agent(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Main AI chat endpoint.
    
    Flow:
    1. User sends a message like "Met Dr. Smith, discussed Product X, positive response"
    2. LangGraph agent processes it
    3. Agent calls log_interaction tool → extracts structured data
    4. We save the extracted data to DB
    5. Agent calls suggest_followups tool → generates AI suggestions
    6. Return full response to frontend

    The frontend then auto-fills the form with the extracted data.
    """
    try:
        # Directly invoke LangGraph tools — exactly 2 LLM calls
        # log_interaction tool → suggest_followups tool
        extracted_data = run_chat_directly(request.message)

        followup_list = extracted_data.pop("ai_suggested_followups", [])

        # Save to DB if HCP selected
        interaction_id = None
        if request.hcp_id:
            sentiment_map = {
                "positive": SentimentEnum.positive,
                "neutral": SentimentEnum.neutral,
                "negative": SentimentEnum.negative
            }
            followup_str = "\n".join([f"• {f}" for f in followup_list])

            db_interaction = Interaction(
                hcp_id=request.hcp_id,
                interaction_type=extracted_data.get("interaction_type", "Meeting"),
                topics_discussed=extracted_data.get("topics_discussed"),
                sentiment=sentiment_map.get(
                    extracted_data.get("sentiment", "neutral"),
                    SentimentEnum.neutral
                ),
                outcomes=extracted_data.get("outcomes"),
                follow_up_actions=extracted_data.get("follow_up_actions"),
                materials_shared=extracted_data.get("materials_shared"),
                ai_suggested_followups=followup_str,
                raw_chat_input=request.message
            )
            db.add(db_interaction)
            db.commit()
            db.refresh(db_interaction)
            interaction_id = db_interaction.id

        extracted_data["ai_suggested_followups"] = followup_list

        return ChatResponse(
            reply=f"✅ Interaction logged! (ID: #{interaction_id}). AI extracted all details and generated {len(followup_list)} follow-up suggestions." if interaction_id else "✅ Processed! Please select an HCP to save.",
            extracted_data=extracted_data,
            interaction_id=interaction_id
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")