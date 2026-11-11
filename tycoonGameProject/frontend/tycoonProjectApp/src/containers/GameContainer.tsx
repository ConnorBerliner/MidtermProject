import { AchievementList } from "../components/AchievementList";
import { useGameLoop } from "../hooks/useGameLoop";
import { logout } from "../store/authSlice";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { CurrencyContainer } from "./CurrencyContainer";
import { NodeListContainer } from "./NodeListContainer";
import { ShopContainer } from "./ShopContainer";

export function GameContainer() {
  useGameLoop();
  const dispatch = useAppDispatch();
  const ready = useAppSelector((s) => s.game.ready);
  const achievements = useAppSelector((s) => s.game.achievements);

  return (
    <main>
      <div className="topbar">
        <CurrencyContainer />
        <button type="button" onClick={() => dispatch(logout())}>
          Sign out
        </button>
      </div>
               {ready ? (
           <>
             <NodeListContainer />
             <ShopContainer />
           </>
         ) : (
           <p role="status">Loading…</p>
         )}
      <AchievementList achievements={achievements} />
    </main>
  );
}