import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, UserSummary } from '@/definitions/authTypes';
import { PermissionCode } from '@/constants/authConstants';

const initialState: AuthState = {
  user: null,
  accessToken: null,
  permissions: [],
  isAuthenticated: false,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        user: UserSummary;
        accessToken: string;
        permissions?: PermissionCode[];
      }>
    ) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      if (action.payload.permissions) {
        state.permissions = action.payload.permissions;
      }
      state.isAuthenticated = true;
    },
    setPermissions: (state, action: PayloadAction<PermissionCode[]>) => {
      state.permissions = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.permissions = [];
      state.isAuthenticated = false;
    },
  },
});

export const { setCredentials, setPermissions, logout } = authSlice.actions;
export default authSlice.reducer;
