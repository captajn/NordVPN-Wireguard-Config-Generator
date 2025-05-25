export interface ServerParams {
  page?: string;
  limit?: number;
  search?: string;
  sort?: string;
  filters?: Record<string, string>;
  noCache?: boolean;
  revalidateSeconds?: number;
  fetchAll?: boolean;
}

export interface ServerInfo {
  id: number;
  name: string;
  hostname: string;
  country: string;
  city: string;
  load: number;
  publicKey: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
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
  serverCount: number;
  cities: Array<{
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    dns_name: string;
    hub_score: number;
    serverCount: number;
  }>;
}

export interface NordVPNLocation {
  id: number;
  created_at: string;
  updated_at: string;
  latitude: number;
  longitude: number;
  country: NordVPNCountry;
}

export interface NordVPNGroup {
  id: number;
  created_at: string;
  updated_at: string;
  title: string;
}

export interface NordVPNServer {
  id: number;
  created_at: string;
  updated_at: string;
  name: string;
  station: string;
  hostname: string;
  load: number;
  status: string;
  locations: NordVPNLocation[];
  technologies: NordVPNTechnology[];
  groups: NordVPNGroup[];
}

export interface WireGuardCredentials {
  expires_at: string;
  service: string;
  username: string;
  private_key: string;
  public_key: string;
  nordlynx_private_key?: string;
  nordlynx_public_key?: string;
  created_at: string;
  updated_at: string;
} 