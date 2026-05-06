// Redux Toolkit store setup
// Redux = a global "single source of truth" for your app's state
// Instead of passing data between components via props, Redux holds it centrally

import { configureStore, createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '../api/apiService';

// ── Async Thunks (API calls that update Redux state) ──────────────────────

// Fetch all HCPs from backend
export const fetchHCPs = createAsyncThunk('crm/fetchHCPs', async () => {
  return await apiService.getHCPs();
});

// Fetch all interactions
export const fetchInteractions = createAsyncThunk('crm/fetchInteractions', async () => {
  return await apiService.getInteractions();
});

// Log a new interaction via form
export const logInteraction = createAsyncThunk('crm/logInteraction', async (data) => {
  return await apiService.createInteraction(data);
});

// Update an existing interaction
export const updateInteraction = createAsyncThunk('crm/updateInteraction', async ({ id, data }) => {
  return await apiService.updateInteraction(id, data);
});

// Delete an interaction
export const deleteInteraction = createAsyncThunk('crm/deleteInteraction', async (id) => {
  await apiService.deleteInteraction(id);
  return id;
});

// Send message to AI agent
export const sendChatMessage = createAsyncThunk('crm/sendChatMessage', async ({ message, hcpId }) => {
  return await apiService.sendChat(message, hcpId);
});


// ── CRM Slice (state + reducers) ──────────────────────────────────────────

const crmSlice = createSlice({
  name: 'crm',
  initialState: {
    // Data
    hcps: [],
    interactions: [],
    chatHistory: [],       // array of { role: 'user'|'ai', content: string }
    extractedFormData: null,  // data AI extracted from chat — used to auto-fill form

    // UI state
    activeTab: 'form',     // 'form' or 'chat'
    selectedHcpId: null,
    isLoading: false,
    isChatLoading: false,
    error: null,
    successMessage: null,
    editingInteractionId: null,  // ID of interaction being edited
  },

  reducers: {
    // Synchronous reducers (no API call)
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
    },
    setSelectedHcp: (state, action) => {
      state.selectedHcpId = action.payload;
    },
    clearExtractedData: (state) => {
      state.extractedFormData = null;
    },
    clearMessages: (state) => {
      state.error = null;
      state.successMessage = null;
    },
    addChatMessage: (state, action) => {
      state.chatHistory.push(action.payload);
    },
    clearChat: (state) => {
      state.chatHistory = [];
      state.extractedFormData = null;
    },
    setEditingInteraction: (state, action) => {
      state.editingInteractionId = action.payload;
    }
  },

  extraReducers: (builder) => {
    // fetchHCPs
    builder.addCase(fetchHCPs.fulfilled, (state, action) => {
      state.hcps = action.payload;
    });

    // fetchInteractions
    builder.addCase(fetchInteractions.fulfilled, (state, action) => {
      state.interactions = action.payload;
    });

    // logInteraction
    builder.addCase(logInteraction.pending, (state) => { state.isLoading = true; });
    builder.addCase(logInteraction.fulfilled, (state, action) => {
      state.isLoading = false;
      state.interactions.unshift(action.payload);  // add to top
      state.successMessage = '✅ Interaction logged successfully!';
    });
    builder.addCase(logInteraction.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.error.message;
    });

    // updateInteraction
    builder.addCase(updateInteraction.fulfilled, (state, action) => {
      const idx = state.interactions.findIndex(i => i.id === action.payload.id);
      if (idx !== -1) state.interactions[idx] = action.payload;
      state.successMessage = '✅ Interaction updated successfully!';
      state.editingInteractionId = null;
    });

    // deleteInteraction
    builder.addCase(deleteInteraction.fulfilled, (state, action) => {
      state.interactions = state.interactions.filter(i => i.id !== action.payload);
      state.successMessage = '🗑️ Interaction deleted.';
    });

    // sendChatMessage
    builder.addCase(sendChatMessage.pending, (state) => { state.isChatLoading = true; });
    builder.addCase(sendChatMessage.fulfilled, (state, action) => {
      state.isChatLoading = false;
      // Add AI response to chat history
      state.chatHistory.push({ role: 'ai', content: action.payload.reply });
      // Store extracted data to auto-fill form
      if (action.payload.extracted_data) {
        state.extractedFormData = action.payload.extracted_data;
      }
    });
    builder.addCase(sendChatMessage.rejected, (state, action) => {
      state.isChatLoading = false;
      state.error = 'AI agent failed: ' + action.error.message;
    });
  }
});

export const {
  setActiveTab, setSelectedHcp, clearExtractedData,
  clearMessages, addChatMessage, clearChat, setEditingInteraction
} = crmSlice.actions;

// Configure the Redux store
export const store = configureStore({
  reducer: {
    crm: crmSlice.reducer
  }
});