import { createContext, useContext, useMemo, useRef, useState } from "react";

type Handlers = {
  onMove?: (delta: 1 | -1) => void;
  onActivate?: () => void;
};

type ContextValue = {
  searchRef: React.MutableRefObject<HTMLInputElement | null>;
  registerHandlers: (h: Handlers) => void;
  unregisterHandlers: (h: Handlers) => void;
  move: (delta: 1 | -1) => void;
  activate: () => void;
  // Whether the groups-list has registered focus handlers (used so we only
  // intercept j/k/Enter when the list is mounted).
  hasList: boolean;
};

const GroupsFocusContext = createContext<ContextValue | null>(null);

export function GroupsFocusProvider({ children }: { children: React.ReactNode }) {
  const searchRef = useRef<HTMLInputElement | null>(null);
  const handlersRef = useRef<Set<Handlers>>(new Set());
  const [hasList, setHasList] = useState(false);

  const value = useMemo<ContextValue>(
    () => ({
      searchRef,
      registerHandlers: (h) => {
        handlersRef.current.add(h);
        setHasList(handlersRef.current.size > 0);
      },
      unregisterHandlers: (h) => {
        handlersRef.current.delete(h);
        setHasList(handlersRef.current.size > 0);
      },
      move: (delta) => {
        handlersRef.current.forEach((h) => h.onMove?.(delta));
      },
      activate: () => {
        handlersRef.current.forEach((h) => h.onActivate?.());
      },
      hasList,
    }),
    [hasList],
  );

  return (
    <GroupsFocusContext.Provider value={value}>
      {children}
    </GroupsFocusContext.Provider>
  );
}

export function useGroupsFocus() {
  const ctx = useContext(GroupsFocusContext);
  if (!ctx) throw new Error("useGroupsFocus must be used within GroupsFocusProvider");
  return ctx;
}
