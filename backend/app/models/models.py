from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum

class SentimentEnum(str, enum.Enum):
    positive = "positive"
    neutral = "neutral"
    negative = "negative"

class HCP(Base):
    """Healthcare Professional table"""
    __tablename__ = "hcps"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    specialty = Column(String(200))
    hospital = Column(String(300))
    email = Column(String(200))
    phone = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # One HCP can have many interactions
    interactions = relationship("Interaction", back_populates="hcp")


class Interaction(Base):
    """Logged interaction between field rep and HCP"""
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True)
    hcp_id = Column(Integer, ForeignKey("hcps.id"), nullable=False)
    interaction_type = Column(String(100), default="Meeting")
    interaction_date = Column(String(50))
    interaction_time = Column(String(50))
    attendees = Column(Text)
    topics_discussed = Column(Text)
    materials_shared = Column(Text)
    samples_distributed = Column(Text)
    sentiment = Column(Enum(SentimentEnum), default=SentimentEnum.neutral)
    outcomes = Column(Text)
    follow_up_actions = Column(Text)
    ai_suggested_followups = Column(Text)
    raw_chat_input = Column(Text)   # stores original chat message from user
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Link back to HCP
    hcp = relationship("HCP", back_populates="interactions")