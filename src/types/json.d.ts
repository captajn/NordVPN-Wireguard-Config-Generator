import type { NordVPNCountry } from './index';

declare module "*.json" {
  const value: NordVPNCountry[];
  export default value;
} 