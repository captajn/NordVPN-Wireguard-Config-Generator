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
  load: number;
  status: 'online' | 'offline';
  country: string;
  city: string;
  technologies: Technology[];
  locations?: NordVPNLocation[];
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
    };
  }>;
}

export interface WireGuardCredentials {
  username: string;
  password: string;
  private_key: string;
  public_key: string;
}

export interface Technology {
  identifier: string;
  name: string;
  status: 'online' | 'offline';
} 