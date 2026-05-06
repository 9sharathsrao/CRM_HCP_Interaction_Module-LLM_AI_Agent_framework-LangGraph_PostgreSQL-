import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  deleteInteraction, fetchInteractions,
  setEditingInteraction, setActiveTab, clearMessages
} from '../store/store';

function InteractionsList() {
  const dispatch = useDispatch();
  const { interactions, hcps } = useSelector(s => s.crm);

  const getHCPName = (hcp_id) => {
    const hcp = hcps.find(h => h.id === hcp_id);
    return hcp ? hcp.name : `HCP #${hcp_id}`;
  };

  const getSentimentBadge = (sentiment) => {
    const map = {
      positive: { emoji: '😊', class: 'badge-positive' },
      neutral:  { emoji: '😐', class: 'badge-neutral' },
      negative: { emoji: '😞', class: 'badge-negative' },
    };
    const s = map[sentiment] || map.neutral;
    return <span className={`badge ${s.class}`}>{s.emoji} {sentiment}</span>;
  };

  const handleEdit = (interactionId) => {
    dispatch(clearMessages());
    dispatch(setEditingInteraction(interactionId));
    dispatch(setActiveTab('form'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this interaction?')) {
      await dispatch(deleteInteraction(id));
      dispatch(fetchInteractions());
    }
  };

  if (interactions.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📭</div>
        <p>No interactions logged yet.</p>
        <p className="empty-sub">Use the form or AI chat to log your first HCP interaction.</p>
      </div>
    );
  }

  return (
    <div className="interactions-list">
      {interactions.map(interaction => (
        <div key={interaction.id} className="interaction-card">
          {/* Card Header */}
          <div className="card-header">
            <div className="card-title">
              <span className="card-hcp-name">👨‍⚕️ {getHCPName(interaction.hcp_id)}</span>
              <span className="card-type">{interaction.interaction_type}</span>
            </div>
            <div className="card-actions">
              <button
                className="icon-btn edit"
                onClick={() => handleEdit(interaction.id)}
                title="Edit"
              >✏️</button>
              <button
                className="icon-btn delete"
                onClick={() => handleDelete(interaction.id)}
                title="Delete"
              >🗑️</button>
            </div>
          </div>

          {/* Date & Sentiment */}
          <div className="card-meta">
            {interaction.interaction_date && (
              <span className="card-date">📅 {interaction.interaction_date}</span>
            )}
            {getSentimentBadge(interaction.sentiment)}
            {interaction.raw_chat_input && (
              <span className="badge badge-ai">🤖 AI Logged</span>
            )}
          </div>

          {/* Topics */}
          {interaction.topics_discussed && (
            <div className="card-field">
              <span className="field-label">Topics:</span>
              <span className="field-value">{interaction.topics_discussed}</span>
            </div>
          )}

          {/* Outcomes */}
          {interaction.outcomes && (
            <div className="card-field">
              <span className="field-label">Outcomes:</span>
              <span className="field-value">{interaction.outcomes}</span>
            </div>
          )}

          {/* AI Suggested Follow-ups */}
          {interaction.ai_suggested_followups && (
            <div className="card-followups">
              <span className="field-label">🤖 AI Suggested Follow-ups:</span>
              <div className="followup-list">
                {interaction.ai_suggested_followups.split('\n').filter(Boolean).map((f, i) => (
                  <div key={i} className="followup-item">{f}</div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="card-footer">
            <span className="card-id">ID: #{interaction.id}</span>
            {interaction.created_at && (
              <span className="card-timestamp">
                {new Date(interaction.created_at).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default InteractionsList;