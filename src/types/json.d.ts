import type { NordVPNCountry } from '../app/types';

declare module "*.json" {
  const value: NordVPNCountry[];
  export default value;
} 