// NordVPN Credentials
export interface NordVPNCredentials {
  username: string;
  password: string;
  expires_at: string;
  token: string;
  renew_token: string;
}

// NordVPN Server
export interface NordVPNServer {
  id: number;
  name: string;
  station: string;
  hostname: string;
  load: number;
  status: string;
  locations: Location[];
  technologies: Technology[];
  groups: Group[];
  specifications: Specification[];
  created_at: string;
  updated_at: string;
  ips: {
    [key: string]: string;
  };
}

// Location
export interface Location {
  id: number;
  country: {
    id: number;
    name: string;
    code: string;
  };
  city: {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
  };
}

// Technology
export interface Technology {
  id: number;
  name: string;
  identifier: string;
  pivot: {
    status: string;
  };
  metadata: {
    [key: string]: unknown;
  };
}

// Group
export interface Group {
  id: number;
  title: string;
  type: string;
  identifier: string;
}

// Specification
export interface Specification {
  id: number;
  identifier: string;
  title: string;
  values: string[] | number[];
}

// WireGuard Credentials
export interface WireGuardCredentials {
  expires_at: string;
  created_at: string;
  id: string;
  private_key?: string;
  public_key?: string;
  nordlynx_private_key?: string;
  nordlynx_public_key?: string;
}

// WireGuard Config
export interface WireGuardConfig {
  privateKey: string;
  address: string[];
  dns: string[];
  publicKey: string;
  endpoint: string;
  allowedIPs: string[];
  persistentKeepalive: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// API Error
export interface ApiError {
  message: string;
  status: number;
}

// Auth State
export interface AuthState {
  isAuthenticated: boolean;
  token?: string;
  user?: {
    email: string;
    username: string;
  };
} 