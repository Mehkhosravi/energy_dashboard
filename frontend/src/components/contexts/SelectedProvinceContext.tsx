// src/context/SelectedProvinceContext.tsx
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { Province } from "./Types";


type SelectedProvinceContextValue = {
  selectedProvince: Province | null;
  setSelectedProvince: (p: Province | null) => void;
};

const SelectedProvinceContext = createContext<
  SelectedProvinceContextValue | undefined
>(undefined);

export function SelectedProvinceProvider({ children }: { children: ReactNode }) {
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(
    null
  );

  return (
    <SelectedProvinceContext.Provider
      value={{ selectedProvince, setSelectedProvince }}
    >
      {children}
    </SelectedProvinceContext.Provider>
  );
}

export function useSelectedProvince() {
  const ctx = useContext(SelectedProvinceContext);
  if (!ctx) {
    throw new Error(
      "useSelectedProvince must be used inside SelectedProvinceProvider"
    );
  }
  return ctx;
}
