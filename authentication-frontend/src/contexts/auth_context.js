import { createContext, useState } from "react";
import {
  setAccessToken,
  removeAccessToken,
  getAccessToken,
} from "../utils/tokenmanager";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(getAccessToken());
  const [user, setUser] = useState(null);

  const login = (accessToken, userData) => {
    setAccessToken(accessToken);
    setToken(accessToken);
    setUser(userData);
  };

  const logout = () => {
    removeAccessToken();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
