import { Toaster } from "react-hot-toast";
import "./App.css";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthContainer } from "./containers/AuthContainer";
import { GameContainer } from "./containers/GameContainer";
import { useAppSelector } from "./store/hooks";

export default function App() {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  return (
    <ErrorBoundary>
      <Toaster position="top-right" />
      {isAuthenticated ? <GameContainer /> : <AuthContainer />}
    </ErrorBoundary>
  );
}