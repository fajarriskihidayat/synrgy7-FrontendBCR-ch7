import {
  Dispatch,
  ReactNode,
  SetStateAction,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { IJWTDecoded } from "../types/types";
import { jwtDecode } from "jwt-decode";
import api from "../api/api";
import { Outlet, useNavigate } from "react-router-dom";
import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";

type AuthContextType = {
  token: string;
  decoded: IJWTDecoded;
};

type AuthDispatchContextType = {
  setToken: Dispatch<SetStateAction<string>>;
  setDecoded: Dispatch<SetStateAction<IJWTDecoded>>;
  apiJWT: AxiosInstance;
};

type AuthProps = {
  children: ReactNode;
};

const AuthContext = createContext<AuthContextType>({
  token: "",
  decoded: { id: 0, email: "", exp: 0, iat: 0 },
});
const AuthDispatchContext = createContext<AuthDispatchContextType | null>(null);

const AuthProvider = ({ children }: AuthProps) => {
  const navigate = useNavigate();
  const [token, setToken] = useState<string>("");
  const [decoded, setDecoded] = useState<IJWTDecoded>({
    id: 0,
    email: "",
    exp: 0,
    iat: 0,
  });

  const refreshToken = async () => {
    try {
      const { data } = await api.get("/users/token");
      setToken(data.accessToken);
      const decoded: IJWTDecoded = jwtDecode(data.accessToken);
      setDecoded(decoded);
    } catch (error: any) {
      if (error.response) {
        localStorage.removeItem("token");
      }
    }
  };

  useEffect(() => {
    refreshToken();
  }, []);

  const apiJWT = axios.create({
    baseURL: "http://localhost:8000/api",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  apiJWT.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      const currentDate = new Date();
      if (decoded.exp * 1000 < currentDate.getTime()) {
        const { data } = await api.get("/users/token");
        config.headers.Authorization = `Bearer ${data.accessToken}`;
        setToken(data.accessToken);
        const decoded: IJWTDecoded = jwtDecode(data.accessToken);
        setDecoded(decoded);
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  return (
    <AuthContext.Provider value={{ token, decoded }}>
      <AuthDispatchContext.Provider value={{ setToken, setDecoded, apiJWT }}>
        {children}
      </AuthDispatchContext.Provider>
    </AuthContext.Provider>
  );
};

export default AuthProvider;

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

export const useDispatchAuth = () => {
  const context = useContext(AuthDispatchContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
