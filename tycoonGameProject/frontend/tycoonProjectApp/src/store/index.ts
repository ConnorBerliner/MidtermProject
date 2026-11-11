import { configureStore, type ThunkAction, type UnknownAction } from "@reduxjs/toolkit";
import { setSessionExpiredHandler } from "../api/client";
import authReducer, { logout } from "./authSlice";
import gameReducer from "./gameSlice";

export const store = configureStore({
  reducer: { game: gameReducer, auth: authReducer },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppThunk<R = void> = ThunkAction<R, RootState, unknown, UnknownAction>;

setSessionExpiredHandler(() => store.dispatch(logout()));