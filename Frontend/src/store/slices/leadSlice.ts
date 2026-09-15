import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  location: string;
  serviceInterest: string;
  message: string;
  source: "Website Forms" | "Landing Pages" | "Meta Ads" | "Google Ads" | "WhatsApp" | "Manual Entry";
  status: "New" | "Contacted" | "Interested" | "Follow-up" | "Converted" | "Lost" | "Not Reachable";
  assignedTo: string;
  followUpDate?: string;
  notes?: string;
  createdAt: string;
}

interface LeadState {
  leads: Lead[];
  filterStatus: string;
  filterSource: string;
  searchQuery: string;
  selectedLeadId: string | null;
}

const initialState: LeadState = {
  leads: [],
  filterStatus: "All",
  filterSource: "All",
  searchQuery: "",
  selectedLeadId: null,
};

const leadSlice = createSlice({
  name: "leads",
  initialState,
  reducers: {
    setLeads: (state, action: PayloadAction<Lead[]>) => {
      state.leads = action.payload;
    },
    addLead: (state, action: PayloadAction<Lead>) => {
      state.leads.unshift(action.payload);
    },
    updateLeadStatus: (state, action: PayloadAction<{ id: string; status: Lead["status"] }>) => {
      const lead = state.leads.find((l) => l.id === action.payload.id);
      if (lead) {
        lead.status = action.payload.status;
      }
    },
    updateLeadNotes: (state, action: PayloadAction<{ id: string; notes: string }>) => {
      const lead = state.leads.find((l) => l.id === action.payload.id);
      if (lead) {
        lead.notes = action.payload.notes;
      }
    },
    updateLeadFollowUp: (state, action: PayloadAction<{ id: string; date: string }>) => {
      const lead = state.leads.find((l) => l.id === action.payload.id);
      if (lead) {
        lead.followUpDate = action.payload.date;
      }
    },
    setFilterStatus: (state, action: PayloadAction<string>) => {
      state.filterStatus = action.payload;
    },
    setFilterSource: (state, action: PayloadAction<string>) => {
      state.filterSource = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setSelectedLeadId: (state, action: PayloadAction<string | null>) => {
      state.selectedLeadId = action.payload;
    },
  },
});

export const {
  setLeads,
  addLead,
  updateLeadStatus,
  updateLeadNotes,
  updateLeadFollowUp,
  setFilterStatus,
  setFilterSource,
  setSearchQuery,
  setSelectedLeadId,
} = leadSlice.actions;

export default leadSlice.reducer;
