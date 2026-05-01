export interface AstroObject {
  id: string;
  name: string;
  type: string;
  constellation: string;
  aliases?: string[];
  distance_ly?: number;
  description?: string;
  extended_description?: string;
  credits?: string;
  license?: string;
}

export interface SubExposure {
  band: string;
  iso?: number;
  gain?: number;
  offset?: number;
  exposure_s: number;
  count: number;
}

export interface CalibrationFrames {
  bias?: number;
  darks?: { exposure_s: number; count: number; temp_c: number | null };
  flats?: { count: number; method: string };
}

export interface FinalImage {
  path: string;
  preview: string;
  title?: string;
  plate_solved?: boolean;
}

export interface Session {
  object_id: string;
  date_utc: string;
  location?: string;
  bortle?: number;
  camera?: string;
  sensor_temp_c?: number | null;
  mount?: string;
  telescope?: string;
  coma_corrector?: string;
  filters?: string[];
  guiding?: { camera?: string; rms_arcsec?: number | null; software?: string };
  subs?: SubExposure[];
  calibration?: CalibrationFrames;
  stacking_software?: string;
  processing_software?: string[];
  finals?: FinalImage[];
  notes?: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  preview: string;
  final: string;
  object: AstroObject;
  session: Session;
}
