import { create } from "zustand";

const storeProfile = create((set) => ({
  user: null,

  // Guardar usuario en Zustand
  setUser: (userData) => set({ user: userData }),

  clearUser: () => {
    set({ user: null });
  },
}));

export default storeProfile;
