import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type UserRole = "super-admin" | "client-admin" | "team";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId?: string;
  companyName?: string;
}

interface AuthState {
  user: User | null;
  activeRole: UserRole;
  isAuthenticated: boolean;
  loading: boolean;
  isMobileSidebarOpen: boolean;
}

const initialState: AuthState = {
  user: null,
  activeRole: "team",
  isAuthenticated: false,
  loading: false,
  isMobileSidebarOpen: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      if (action.payload?.role) {
        state.activeRole = action.payload.role;
      } else if (!state.activeRole) {
        state.activeRole = "team";
      }
    },
    setActiveRole: (state, action: PayloadAction<UserRole>) => {
      state.activeRole = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.activeRole = "team";
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    },
    toggleMobileSidebar: (state) => {
      state.isMobileSidebarOpen = !state.isMobileSidebarOpen;
    },
    setMobileSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.isMobileSidebarOpen = action.payload;
    },
  },
});

export const { setUser, setActiveRole, logout, toggleMobileSidebar, setMobileSidebarOpen } = authSlice.actions;
export default authSlice.reducer;
