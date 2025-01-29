export interface FSSSignalDiscovered {
  timestamp: string;
  SignalName: string;
  SignalType?: string;
  IsStation?: boolean;
  USSType?: string;
  SpawningState?: string;
  SpawningFaction?: string;
  SpawningPower?: string;
  OpposingPower?: string;
  ThreatLevel?: number;
}

export interface EDDN<T> {
  $schemaRef: string;
  header: {
    uploaderID: string;
    gameversion?: string;
    gamebuild?: string;
    softwareName: string;
    softwareVersion: string;
    gatewayTimestamp?: string;
  };
  message: {
    event: string;
    horizons?: boolean;
    odyssey?: boolean;
    timestamp: string;
    SystemAddress: number;
    signals: T[];
    StarSystem: string;
    StarPos: [number, number, number];
  };
}
