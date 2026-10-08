import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AgentExecutionResult } from '@/definitions/agentTypes';

export interface AgentState {
  latestResult: AgentExecutionResult | null;
  isTraceModalOpen: boolean;
}

const initialState: AgentState = {
  latestResult: null,
  isTraceModalOpen: false,
};

export const agentSlice = createSlice({
  name: 'agent',
  initialState,
  reducers: {
    setLatestAgentResult: (
      state,
      action: PayloadAction<AgentExecutionResult | null>,
    ) => {
      state.latestResult = action.payload;
      if (action.payload) {
        state.isTraceModalOpen = true;
      }
    },
    openTraceModal: (state) => {
      state.isTraceModalOpen = true;
    },
    closeTraceModal: (state) => {
      state.isTraceModalOpen = false;
    },
    toggleTraceModal: (state) => {
      state.isTraceModalOpen = !state.isTraceModalOpen;
    },
    clearAgentResult: (state) => {
      state.latestResult = null;
    },
  },
});

export const {
  setLatestAgentResult,
  openTraceModal,
  closeTraceModal,
  toggleTraceModal,
  clearAgentResult,
} = agentSlice.actions;

export default agentSlice.reducer;
