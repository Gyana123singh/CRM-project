import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import leadReducer from "./slices/leadSlice";
import chatReducer from "./slices/chatSlice";
import automationReducer from "./slices/automationSlice";
import ticketReducer from "./slices/ticketSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    leads: leadReducer,
    chat: chatReducer,
    automation: automationReducer,
    tickets: ticketReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export all slices actions, action creators, and types for a unified store API import interface
export * from "./slices/authSlice";
export * from "./slices/leadSlice";
export * from "./slices/chatSlice";
export * from "./slices/automationSlice";
export {
  addTicket,
  updateTicketStatus,
  updateTicketPriority,
  assignTicket,
  addTicketMessage
} from "./slices/ticketSlice";
export type { Ticket, TicketMessage } from "./slices/ticketSlice";

export default store;
