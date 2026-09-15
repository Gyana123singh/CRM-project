import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface AutomationRule {
  id: string;
  name: string;
  trigger: "New Lead Created" | "Status Updated" | "No Customer Response";
  condition?: string;
  actions: string[];
  delay: string;
  status: "active" | "paused";
  createdAt: string;
}

interface AutomationState {
  rules: AutomationRule[];
}

const initialState: AutomationState = {
  rules: [],
};

const automationSlice = createSlice({
  name: "automation",
  initialState,
  reducers: {
    setRules: (state, action: PayloadAction<AutomationRule[]>) => {
      state.rules = action.payload;
    },
    addRule: (state, action: PayloadAction<AutomationRule>) => {
      state.rules.unshift(action.payload);
    },
    toggleRuleStatus: (state, action: PayloadAction<{ id: string }>) => {
      const rule = state.rules.find((r) => r.id === action.payload.id);
      if (rule) {
        rule.status = rule.status === "active" ? "paused" : "active";
      }
    },
    deleteRule: (state, action: PayloadAction<{ id: string }>) => {
      state.rules = state.rules.filter((r) => r.id !== action.payload.id);
    },
  },
});

export const { setRules, addRule, toggleRuleStatus, deleteRule } = automationSlice.actions;
export default automationSlice.reducer;
