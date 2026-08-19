import React, { createContext, useContext, useState, useEffect } from "react";
import type { User, Project } from "../types";
import { api } from "../lib/api";

interface AppContextType {
  user: User | null;
  token: string | null;
  projects: Project[];
  selectedProjectId: string | null;
  activeProject: Project | null;
  environment: "test" | "live";
  setEnvironment: (env: "test" | "live") => void;
  setSelectedProjectId: (id: string | null) => void;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshProjects: () => Promise<void>;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectIdState] = useState<string | null>(null);
  const [environment, setEnvironmentState] = useState<"test" | "live">("test");
  const [isLoading, setIsLoading] = useState(true);

  // Derive the active project object from projects list
  const activeProject = projects.find((p) => p.id === selectedProjectId) || null;

  // Custom environment setter persisting selection in localStorage
  const setEnvironment = (env: "test" | "live") => {
    setEnvironmentState(env);
    localStorage.setItem("environment", env);
  };

  // Custom project setter persisting selection in localStorage
  const setSelectedProjectId = (id: string | null) => {
    setSelectedProjectIdState(id);
    if (id) {
      localStorage.setItem("selectedProjectId", id);
    } else {
      localStorage.removeItem("selectedProjectId");
    }
  };

  const refreshProjects = async () => {
    try {
      const response = await api.get("/api/v1/projects");
      const fetchedProjects: Project[] = response.data.projects || response.data.data || [];
      setProjects(fetchedProjects);

      // Determine the best project workspace to focus on
      const storedProjId = localStorage.getItem("selectedProjectId");
      if (storedProjId && fetchedProjects.some((p) => p.id === storedProjId)) {
        setSelectedProjectIdState(storedProjId);
      } else if (fetchedProjects.length > 0) {
        setSelectedProjectId(fetchedProjects[0].id);
      } else {
        setSelectedProjectId(null);
      }
    } catch (err) {
      console.error("Failed to load project workspaces", err);
    }
  };

  // Initial user session and available project workspaces restoration bootstrap
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem("token");
      const savedUser = localStorage.getItem("user");
      const savedEnv = localStorage.getItem("environment") as "test" | "live";

      if (savedEnv === "test" || savedEnv === "live") {
        setEnvironmentState(savedEnv);
      }

      if (savedToken) {
        setToken(savedToken);
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }

        try {
          // Verify current user details & hydrate projects in parallel
          const meResponse = await api.get("/api/v1/auth/me", {
            headers: { Authorization: `Bearer ${savedToken}` },
          });
          const currentUser = meResponse.data.context?.user || meResponse.data.user;
          if (currentUser) {
            setUser(currentUser);
            localStorage.setItem("user", JSON.stringify(currentUser));
          }

          // Hydrate workspace projects
          const projResponse = await api.get("/api/v1/projects", {
            headers: { Authorization: `Bearer ${savedToken}` },
          });
          const fetchedProjects: Project[] = projResponse.data.projects || projResponse.data.data || [];
          setProjects(fetchedProjects);

          const storedProjId = localStorage.getItem("selectedProjectId");
          if (storedProjId && fetchedProjects.some((p) => p.id === storedProjId)) {
            setSelectedProjectIdState(storedProjId);
          } else if (fetchedProjects.length > 0) {
            setSelectedProjectIdState(fetchedProjects[0].id);
            localStorage.setItem("selectedProjectId", fetchedProjects[0].id);
          }
        } catch (err) {
          console.error("Session verification failed", err);
          logout();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = (newToken: string, loggedUser: User) => {
    setToken(newToken);
    setUser(loggedUser);
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(loggedUser));
    setIsLoading(true);

    // Refresh projects list upon login to populate workspaces
    api
      .get("/api/v1/projects", { headers: { Authorization: `Bearer ${newToken}` } })
      .then((res) => {
        const fetched = res.data.projects || res.data.data || [];
        setProjects(fetched);
        if (fetched.length > 0) {
          setSelectedProjectId(fetched[0].id);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load projects upon login", err);
        setIsLoading(false);
      });
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setProjects([]);
    setSelectedProjectIdState(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("selectedProjectId");
  };

  return (
    <AppContext.Provider
      value={{
        user,
        token,
        projects,
        selectedProjectId,
        activeProject,
        environment,
        setEnvironment,
        setSelectedProjectId,
        login,
        logout,
        refreshProjects,
        isLoading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
