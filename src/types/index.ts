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
  locations: NordVPNLocation[];
  technologies: Array<{
    id: number;
    name: string;
    identifier: string;
    metadata?: Array<{
      name: string;
      value: string;
    }>;
    pivot?: {
      public_key?: string;
      status?: string;
    };
  }>;
  groups?: Group[];
  specifications?: Specification[];
  created_at?: string;
  updated_at?: string;
  ips?: {
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
  id?: number;
  name: string;
  identifier: string;
  status?: 'online' | 'offline';
  pivot?: {
    status: string;
  };
  metadata?: {
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
  username?: string;
  password?: string;
  expires_at?: string;
  created_at?: string;
  id?: string;
  private_key: string;
  public_key: string;
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

// OpenVPN Protocol Types
export type OpenVPNProtocol = 
  | 'openvpn_udp'
  | 'openvpn_tcp'
  | 'openvpn_xor_udp'
  | 'openvpn_xor_tcp'
  | 'openvpn_udp_tls_crypt'
  | 'openvpn_tcp_tls_crypt';

// OpenVPN Credentials
export interface OpenVPNCredentials {
  username: string;
  password: string;
  expires_at: string;
  created_at: string;
}

// Server Info
export interface ServerInfo {
  id: number;
  name: string;
  hostname: string;
  country: string;
  city?: string;
  load: number;
  status?: 'online' | 'offline';
  technologies?: Technology[];
  locations?: NordVPNLocation[];
}

// OpenVPN Server Info
export interface OpenVPNServerInfo extends ServerInfo {
  protocol: OpenVPNProtocol;
}

// OpenVPN Config
export interface OpenVPNConfig {
  username: string;
  password: string;
  protocol: string;
  hostname: string;
  port: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
  timestamp?: number;
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

// Server Params
export interface ServerParams {
  page?: string;
  limit?: number;
  offset?: number;
  search?: string;
  sort?: string;
  filters?: Record<string, string>;
  noCache?: boolean;
  revalidateSeconds?: number;
  fetchAll?: boolean;
}

export interface NordVPNTechnology {
  id: number;
  name: string;
  identifier: string;
  created_at: string;
  updated_at: string;
  metadata?: Array<{
    name: string;
    value: string;
  }>;
  pivot: {
    server_id: number;
    technology_id: number;
    public_key?: string;
  };
}

export interface NordVPNCountry {
  id: number;
  name: string;
  code: string;
  city?: NordVPNCity;
}

export interface NordVPNCity {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  dns_name: string;
  hub_score: number;
}

export interface NordVPNLocation {
  id: number;
  created_at?: string;
  updated_at?: string;
  latitude: number;
  longitude: number;
  country: NordVPNCountry;
} 