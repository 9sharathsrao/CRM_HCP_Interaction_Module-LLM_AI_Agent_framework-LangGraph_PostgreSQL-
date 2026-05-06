import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  logInteraction, updateInteraction, fetchInteractions,
  clearExtractedData, clearMessages, setEditingInteraction
} from '../store/store';

function LogInteractionForm() {
  const dispatch = useDispatch();
  const { hcps, extractedFormData, isLoading, editingInteractionId, interactions } = useSelector(s => s.crm);

  const emptyForm = {
    hcp_id: '',
    interaction_type: 'Meeting',
    interaction_date: new Date().toISOString().split('T')[0],
    interaction_time: new Date().toTimeString().slice(0, 5),
    attendees: '',
    topics_discussed: '',
    materials_shared: '',
    samples_distributed: '',
    sentiment: 'neutral',
    outcomes: '',
    follow_up_actions: '',
  };

  const [form, setForm] = useState(emptyForm);

  // Auto-fill form when AI extracts data from chat
  useEffect(() => {
    if (extractedFormData) {
      setForm(prev => ({
        ...prev,
        interaction_type: extractedFormData.interaction_type || prev.interaction_type,
        topics_discussed: extractedFormData.topics_discussed || prev.topics_discussed,
        sentiment: extractedFormData.sentiment || prev.sentiment,
        outcomes: extractedFormData.outcomes || prev.outcomes,
        follow_up_actions: extractedFormData.follow_up_actions || prev.follow_up_actions,
        materials_shared: extractedFormData.materials_shared || prev.materials_shared,
      }));
    }
  }, [extractedFormData]);

  // Load interaction data when editing
  useEffect(() => {
    if (editingInteractionId) {
      const interaction = interactions.find(i => i.id === editingInteractionId);
      if (interaction) {
        setForm({
          hcp_id: interaction.hcp_id || '',
          interaction_type: interaction.interaction_type || 'Meeting',
          interaction_date: interaction.interaction_date || '',
          interaction_time: interaction.interaction_time || '',
          attendees: interaction.attendees || '',
          topics_discussed: interaction.topics_discussed || '',
          materials_shared: interaction.materials_shared || '',
          samples_distributed: interaction.samples_distributed || '',
          sentiment: interaction.sentiment || 'neutral',
          outcomes: interaction.outcomes || '',
          follow_up_actions: interaction.follow_up_actions || '',
        });
      }
    }
  }, [editingInteractionId, interactions]);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.hcp_id) { alert('Please select an HCP'); return; }
    dispatch(clearMessages());

    if (editingInteractionId) {
      await dispatch(updateInteraction({ id: editingInteractionId, data: form }));
    } else {
      await dispatch(logInteraction({ ...form, hcp_id: parseInt(form.hcp_id) }));
    }

    dispatch(fetchInteractions());
    dispatch(clearExtractedData());
    setForm(emptyForm);
    dispatch(setEditingInteraction(null));
  };

  const handleCancel = () => {
    setForm(emptyForm);
    dispatch(setEditingInteraction(null));
    dispatch(clearExtractedData());
  };

  return (
    <form className="interaction-form" onSubmit={handleSubmit}>
      {extractedFormData && (
        <div className="ai-filled-banner">
          🤖 Form auto-filled by AI — please review before submitting
        </div>
      )}
      {editingInteractionId && (
        <div className="edit-banner">
          ✏️ Editing Interaction #{editingInteractionId}
        </div>
      )}

      {/* Row 1 */}
      <div className="form-row">
        <div className="form-group">
          <label>HCP Name *</label>
          <select name="hcp_id" value={form.hcp_id} onChange={handleChange} required>
            <option value="">Search or select HCP...</option>
            {hcps.map(h => (
              <option key={h.id} value={h.id}>{h.name} — {h.specialty}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Interaction Type</label>
          <select name="interaction_type" value={form.interaction_type} onChange={handleChange}>
            <option>Meeting</option>
            <option>Call</option>
            <option>Email</option>
            <option>Conference</option>
            <option>Virtual</option>
          </select>
        </div>
      </div>

      {/* Row 2 */}
      <div className="form-row">
        <div className="form-group">
          <label>Date</label>
          <input type="date" name="interaction_date" value={form.interaction_date} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Time</label>
          <input type="time" name="interaction_time" value={form.interaction_time} onChange={handleChange} />
        </div>
      </div>

      {/* Attendees */}
      <div className="form-group full-width">
        <label>Attendees</label>
        <input type="text" name="attendees" placeholder="Enter names or search..." value={form.attendees} onChange={handleChange} />
      </div>

      {/* Topics */}
      <div className="form-group full-width">
        <label>Topics Discussed</label>
        <textarea name="topics_discussed" rows={3} placeholder="Enter key discussion points..." value={form.topics_discussed} onChange={handleChange} />
      </div>

      {/* Materials & Samples */}
      <div className="form-row">
        <div className="form-group">
          <label>Materials Shared</label>
          <input type="text" name="materials_shared" placeholder="e.g. Product brochure, clinical data..." value={form.materials_shared} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Samples Distributed</label>
          <input type="text" name="samples_distributed" placeholder="e.g. Product X — 5 samples" value={form.samples_distributed} onChange={handleChange} />
        </div>
      </div>

      {/* Sentiment */}
      <div className="form-group full-width">
        <label>Observed HCP Sentiment</label>
        <div className="sentiment-radio">
          {['positive', 'neutral', 'negative'].map(s => (
            <label key={s} className={`sentiment-option ${form.sentiment === s ? 'selected' : ''} sentiment-${s}`}>
              <input type="radio" name="sentiment" value={s} checked={form.sentiment === s} onChange={handleChange} />
              {s === 'positive' ? '😊 Positive' : s === 'neutral' ? '😐 Neutral' : '😞 Negative'}
            </label>
          ))}
        </div>
      </div>

      {/* Outcomes */}
      <div className="form-group full-width">
        <label>Outcomes</label>
        <textarea name="outcomes" rows={2} placeholder="Key outcomes or agreements..." value={form.outcomes} onChange={handleChange} />
      </div>

      {/* Follow-up */}
      <div className="form-group full-width">
        <label>Follow-up Actions</label>
        <textarea name="follow_up_actions" rows={2} placeholder="Enter next steps or tasks..." value={form.follow_up_actions} onChange={handleChange} />
      </div>

      {/* Buttons */}
      <div className="form-actions">
        {editingInteractionId && (
          <button type="button" className="btn btn-secondary" onClick={handleCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          {isLoading ? '⏳ Saving...' : editingInteractionId ? '💾 Update Interaction' : '✅ Log Interaction'}
        </button>
      </div>
    </form>
  );
}

export default LogInteractionForm;