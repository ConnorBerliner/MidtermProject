import { useEffect } from "react";
import toast from "react-hot-toast";
import { formatNumber } from "../lib/format";
import { useAppDispatch } from "../store/hooks";
import { boot, persist, sync, tick } from "../store/gameSlice";

const TICK_MS = 100;
const SAVE_MS = 5_000;
const SYNC_MS = 30_000;

export function useGameLoop(): void {
  const dispatch = useAppDispatch();

  useEffect(() => {
    void dispatch(boot()).then((earned) => {
      if (earned >= 1) {
        toast.success(`Welcome back! You earned ${formatNumber(earned)} while away.`, {
          id: "welcome-back",
        });
      }
    });

    let last = performance.now();
    const tickTimer = window.setInterval(() => {
      const now = performance.now();
            dispatch(tick({ dt: (now - last) / 1000, now: Date.now() }));
      last = now;
    }, TICK_MS);
    const saveTimer = window.setInterval(() => dispatch(persist()), SAVE_MS);
    const syncTimer = window.setInterval(() => void dispatch(sync()), SYNC_MS);
    const onHide = () => {
      if (document.hidden) dispatch(persist());
    };
    document.addEventListener("visibilitychange", onHide);

    return () => {
      window.clearInterval(tickTimer);
      window.clearInterval(saveTimer);
      window.clearInterval(syncTimer);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [dispatch]);
}