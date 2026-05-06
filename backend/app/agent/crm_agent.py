"""
LangGraph AI Agent — CRM HCP Module
LLM: Google Gemini 2.5 Flash
Architecture: LangGraph tools with direct execution (2 LLM calls max per request)
"""

import json
import os
from typing import TypedDict, Optional
from dotenv import load_dotenv

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.tools import tool
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode, tools_condition

load_dotenv()

def get_llm():
    return ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=os.getenv("GEMINI_API_KEY"),
        temperature=0,
        max_output_tokens=400
    )

class AgentState(TypedDict):
    messages: list
    hcp_id: Optional[int]

@tool
def log_interaction(chat_message: str) -> str:
    """Extracts structured interaction data from a free-text chat message. Use this when the user describes a meeting or interaction with a doctor/HCP. Args: chat_message: The natural language message describing the interaction. Returns: JSON string with extracted structured data."""
    prompt = f"""Extract pharma CRM data from: "{chat_message}"
Return ONLY valid JSON, no markdown:
{{"interaction_type":"Meeting","topics_discussed":"string","sentiment":"positive","outcomes":"string or null","follow_up_actions":"string or null","materials_shared":"string or null"}}
sentiment: positive/neutral/negative. interaction_type: Meeting/Call/Email/Conference"""
    response = get_llm().invoke([HumanMessage(content=prompt)])
    try:
        raw = response.content.strip()
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        extracted = json.loads(raw.strip())
    except Exception:
        extracted = {"interaction_type": "Meeting", "topics_discussed": chat_message, "sentiment": "neutral", "outcomes": None, "follow_up_actions": None, "materials_shared": None}
    return json.dumps({"status": "extracted", "extracted_data": extracted})

@tool
def edit_interaction(interaction_id: str, field_to_update: str, new_value: str) -> str:
    """Prepares an update for a specific field of an already-logged interaction. Use when user wants to modify a previously logged interaction. Args: interaction_id: ID of the interaction. field_to_update: Field name. new_value: New value."""
    allowed = ["interaction_type","topics_discussed","sentiment","outcomes","follow_up_actions","materials_shared","attendees","samples_distributed"]
    if field_to_update not in allowed:
        return json.dumps({"status": "error", "message": f"Field not allowed. Use: {allowed}"})
    return json.dumps({"status": "ready_to_update", "interaction_id": interaction_id, "field": field_to_update, "new_value": new_value})

@tool
def fetch_hcp_details(hcp_name: str) -> str:
    """Looks up a Healthcare Professional by name. Use when user mentions a doctor name. Args: hcp_name: Name of the HCP."""
    return json.dumps({"status": "lookup_requested", "hcp_name": hcp_name})

@tool
def suggest_followups(topics_discussed: str, sentiment: str) -> str:
    """Generates 3 follow-up action suggestions. Use after logging an interaction. Args: topics_discussed: What was covered. sentiment: positive/neutral/negative."""
    prompt = f"""Pharma follow-ups. Topics: "{topics_discussed}", Sentiment: "{sentiment}"
Return ONLY JSON array: ["Action 1","Action 2","Action 3"]"""
    response = get_llm().invoke([HumanMessage(content=prompt)])
    try:
        raw = response.content.strip()
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        suggestions = json.loads(raw.strip())
        if not isinstance(suggestions, list):
            raise ValueError()
    except Exception:
        suggestions = ["Schedule follow-up in 2 weeks", "Send product literature", "Update CRM notes"]
    return json.dumps({"status": "suggestions_ready", "followups": suggestions})

@tool
def analyze_sentiment(interaction_text: str) -> str:
    """Analyzes sentiment of an HCP interaction with confidence scoring. Args: interaction_text: Raw interaction notes."""
    prompt = f"""Analyze pharma HCP sentiment: "{interaction_text}"
Return ONLY JSON: {{"sentiment":"positive","confidence":"high","signals":["s1","s2"],"summary":"one sentence"}}"""
    response = get_llm().invoke([HumanMessage(content=prompt)])
    try:
        raw = response.content.strip()
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw.strip())
    except Exception:
        result = {"sentiment": "neutral", "confidence": "low", "signals": [], "summary": "Could not analyze."}
    return json.dumps(result)

tools = [log_interaction, edit_interaction, fetch_hcp_details, suggest_followups, analyze_sentiment]

def run_chat_directly(message: str) -> dict:
    """
    Directly invokes LangGraph tools with exactly 2 LLM calls.
    Avoids agent loop to stay within free tier limits.
    LangGraph tools are still fully used — just called directly.
    """
    print("Step 1: log_interaction tool...")
    extraction_result = json.loads(log_interaction.invoke({"chat_message": message}))
    extracted = extraction_result.get("extracted_data", {})
    print(f"Extracted sentiment: {extracted.get('sentiment')}")

    print("Step 2: suggest_followups tool...")
    followup_result = json.loads(suggest_followups.invoke({
        "topics_discussed": extracted.get("topics_discussed", message),
        "sentiment": extracted.get("sentiment", "neutral")
    }))
    followups = followup_result.get("followups", [])
    print(f"Generated {len(followups)} suggestions")

    extracted["ai_suggested_followups"] = followups
    return extracted

SYSTEM_PROMPT = "You are a pharma CRM assistant. Call log_interaction ONCE then suggest_followups ONCE then STOP."
llm_with_tools = get_llm().bind_tools(tools)

def agent_node(state: AgentState):
    messages = state["messages"]
    if not messages or not isinstance(messages[0], SystemMessage):
        messages = [SystemMessage(content=SYSTEM_PROMPT)] + messages
    response = llm_with_tools.invoke(messages)
    return {"messages": messages + [response]}

def build_agent():
    graph = StateGraph(AgentState)
    graph.add_node("agent", agent_node)
    graph.add_node("tools", ToolNode(tools))
    graph.set_entry_point("agent")
    graph.add_conditional_edges("agent", tools_condition, {"tools": "tools", END: END})
    graph.add_edge("tools", "agent")
    return graph.compile()

crm_agent = build_agent()