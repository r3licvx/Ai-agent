import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/constants";

export type Profile = {
  id: string;
  display_name: string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url: string | null;
  selected_model?: string;
  custom_instructions?: string;
};

type LocalUser = {
  id: string;
  email: string;
};

type AuthState = {
  user: LocalUser | null;
  session: { user: LocalUser } | null;
  profile: Profile | null;
  loading: boolean;
  loginLocal: (displayName?: string) => void;
  updateProfile: (partial: Partial<Profile>) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

const STORAGE_KEY_USER = "ai_agent_user_session";
const STORAGE_KEY_PROFILE = "ai_agent_user_profile";
const STORAGE_KEY_MESSAGES = "ai_agent_messages_v2";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedUser = localStorage.getItem(STORAGE_KEY_USER);
        const storedProfile = localStorage.getItem(STORAGE_KEY_PROFILE);

        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        }
        if (storedProfile) {
          const parsedProfile = JSON.parse(storedProfile);
          if (!parsedProfile.custom_instructions) {
            parsedProfile.custom_instructions = DEFAULT_SYSTEM_PROMPT;
          }
          setProfile(parsedProfile);
        } else if (storedUser) {
          const defaultProfile: Profile = {
            id: "local-user-id",
            display_name: "Bro",
            first_name: "Bro",
            last_name: null,
            avatar_url: null,
            selected_model: "gemini-4-argon",
            custom_instructions: DEFAULT_SYSTEM_PROMPT,
          };
          setProfile(defaultProfile);
          localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(defaultProfile));
        }
      } catch (err) {
        console.warn("Failed to read local auth storage", err);
      } finally {
        setLoading(false);
      }
    }
  }, []);

  const loginLocal = (displayName = "Bro") => {
    const localUser: LocalUser = {
      id: "local-user-id",
      email: "user@local.app",
    };
    const defaultProfile: Profile = {
      id: "local-user-id",
      display_name: displayName,
      first_name: displayName,
      last_name: null,
      avatar_url: null,
      selected_model: "gemini-4-argon",
      custom_instructions: DEFAULT_SYSTEM_PROMPT,
    };

    setUser(localUser);
    setProfile(defaultProfile);

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(localUser));
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(defaultProfile));
    }
  };

  const updateProfile = async (partial: Partial<Profile>) => {
    setProfile((prev) => {
      const updated: Profile = {
        id: prev?.id || "local-user-id",
        display_name:
          partial.display_name !== undefined ? partial.display_name : prev?.display_name || "Bro",
        first_name:
          partial.first_name !== undefined ? partial.first_name : prev?.first_name || null,
        last_name: partial.last_name !== undefined ? partial.last_name : prev?.last_name || null,
        avatar_url:
          partial.avatar_url !== undefined ? partial.avatar_url : prev?.avatar_url || null,
        selected_model: partial.selected_model || prev?.selected_model || "gemini-4-argon",
        custom_instructions:
          partial.custom_instructions !== undefined
            ? partial.custom_instructions
            : prev?.custom_instructions || DEFAULT_SYSTEM_PROMPT,
      };

      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(updated));
      }
      return updated;
    });
  };

  const signOut = async () => {
    setUser(null);
    setProfile(null);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY_USER);
        localStorage.removeItem(STORAGE_KEY_PROFILE);
        localStorage.removeItem(STORAGE_KEY_MESSAGES);
        localStorage.clear();
      } catch (e) {
        console.warn("Error clearing local storage on signOut", e);
      }
    }
  };

  const value: AuthState = {
    user,
    session: user ? { user } : null,
    profile,
    loading,
    loginLocal,
    updateProfile,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
