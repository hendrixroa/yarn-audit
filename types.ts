export interface AuditData {
  type: string;
  data: Data;
}

export interface Data {
  vulnerabilities: Vulnerabilities;
  dependencies: number;
  devDependencies: number;
  optionalDependencies: number;
  totalDependencies: number;
}

export interface Vulnerabilities {
  info: number;
  low: number;
  moderate: number;
  high: number;
  critical: number;
}
