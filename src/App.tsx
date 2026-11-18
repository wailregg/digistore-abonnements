import { useEffect, useRef, useState } from "react";
import { DEMO, isOwner, sb } from "./lib/backend";
import { StoreProvider } from "./lib/store";
import { hasPin, lockMinutes } from "./lib/pin";
import { Login, LockScreen, SetPinScreen } from "./screens/Auth";
import { Home } from "./screens/Home";
import { Clients } from "./screens/Clients";
import { ClientCard } from "./screens/ClientCard";
import { AddSale } from "./screens/AddSale";
import { AccountScreen } from "./screens/Account";
import { Money } from "./screens/Money";
import { SettingsScreen } from "./screens/Settings";
import { ImportScreen } from "./screens/Import";

export function App() {
  const [auth, setAuth] = useState<"loading" | "out" | "in">(DEMO ? "in" : "loading");

  useEffect(() => {
    if (!sb) return;
    void sb.auth.getSession().then(({ data }) => setAuth(data.session ? "in" : "out"));
    const { data } = sb.auth.onAuthStateChange((_e, session) => setAuth(session ? "in" : "out"));
    return () => data.subscription.unsubscribe();
  }, []);

  if (auth === "loading")
    return (
      <div className="center">
        <span className="spinner" aria-hidden="true" />
      </div>
    );
  if (auth === "out") return <Login />;
  return <Gate />;
}

function Gate() {
  const [owner, setOwner] = useState<boolean | null>(DEMO ? true : null);
  const [pinSet, setPinSet] = useState(hasPin());
  const [locked, setLocked] = useState(hasPin() && !DEMO);
  const hiddenAt = useRef<number | null>(null);

  useEffect(() => {
    if (DEMO) return;
    isOwner()
      .then(setOwner)
      .catch(() => setOwner(false));
  }, []);

  // Lock again after some minutes in the background.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") hiddenAt.current = Date.now();
      else if (hiddenAt.current && Date.now() - hiddenAt.current > lockMinutes() * 60000 && hasPin()) setLocked(true);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  if (owner === null)
    return (
      <div className="center">
        <span className="spinner" aria-hidden="true" />
      </div>
    );
  if (!owner)
    return (
      <div className="center">
        <h2>هذا الحساب ما عندوش الحق يدخل</h2>
        <button className="btn btn-y" onClick={() => void sb?.auth.signOut()}>
          اخرج
        </button>
      </div>
    );
  if (!pinSet && !DEMO) return <SetPinScreen onDone={() => setPinSet(true)} />;
  if (locked) return <LockScreen onUnlock={() => setLocked(false)} />;
  return (
    <StoreProvider>
      <Router />
    </StoreProvider>
  );
}

function useHash(): string {
  const [h, setH] = useState(location.hash || "#/");
  useEffect(() => {
    const on = () => {
      setH(location.hash || "#/");
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return h;
}

function Router() {
  const hash = useHash();
  const [path, query = ""] = hash.slice(1).split("?");
  const q = new URLSearchParams(query);
  const parts = path.split("/").filter(Boolean);
  const key = hash;
  switch (parts[0]) {
    case "clients":
      return <Clients key={key} product={q.get("p") ?? undefined} />;
    case "client":
      return <ClientCard key={key} id={parts[1]} />;
    case "add":
      return <AddSale key={key} query={q} />;
    case "account":
      return <AccountScreen key={key} id={parts[1]} />;
    case "money":
      return <Money key={key} />;
    case "settings":
      return <SettingsScreen key={key} />;
    case "import":
      return <ImportScreen key={key} />;
    default:
      return <Home key={key} />;
  }
}
