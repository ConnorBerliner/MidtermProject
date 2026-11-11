import { createSlice } from "@reduxjs/toolkit";
import { authApi } from "../api/authApi";
import { tokens } from "../api/tokens";
import type { Credentials } from "../types/api";
import { loggedOut } from "./actions";
import { clearGameCache, resetBootGuard } from "./gameSlice";
import type { AppThunk } from "./index";

const slice = createSlice({
  name: "auth",
  initialState: { isAuthenticated: tokens.getAccess() !== null },
  reducers: {
    loggedIn(state) {
      state.isAuthenticated = true;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loggedOut, () => ({ isAuthenticated: false }));
  },
});

export const { loggedIn } = slice.actions;
export default slice.reducer;

export const login =
  (credentials: Credentials): AppThunk<Promise<void>> =>
  async (dispatch) => {
    const pair = await authApi.login(credentials); // ApiError propagates to the caller
    tokens.set(pair.access, pair.refresh);
    dispatch(loggedIn());
  };

export const register =
  (credentials: Credentials): AppThunk<Promise<void>> =>
  async (dispatch) => {
    await authApi.register(credentials);
    await dispatch(login(credentials));
  };

export const logout = (): AppThunk => (dispatch) => {
  tokens.clear();
  clearGameCache();
  resetBootGuard();
  dispatch(loggedOut());
};