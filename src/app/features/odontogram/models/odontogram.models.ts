export type Dentition = 'PERMANENT' | 'DECIDUOUS';
export type Arch = 'UPPER' | 'LOWER';
export type ToothType = 'INCISOR' | 'CANINE' | 'PREMOLAR' | 'MOLAR';
export type ConditionCategory = 'DENTAL' | 'PERIODONTAL';
export type ConditionScope = 'TOOTH' | 'SURFACE' | 'SPAN';
export type FindingStatus = 'PENDING' | 'DONE';
export type SurfaceCode = 'O' | 'V' | 'L' | 'M' | 'D';
export type SymbolShape =
  | 'ASTERISK'
  | 'CROSS'
  | 'CIRCLE'
  | 'CIRCLE_CROSS'
  | 'TRIANGLE'
  | 'DOUBLE_SQUARE'
  | 'RECTANGLE'
  | 'SQUARES_LINE'
  | 'DOTS_PARENTHESES'
  | 'EQUALS'
  | 'NUMBER';

export interface DentalSymbol {
  id: number;
  status: FindingStatus;
  shape: SymbolShape;
  color: string;
  secondaryColor: string | null;
  filled: boolean;
  lineStyle: 'SOLID' | 'DOTTED';
}

export interface Tooth {
  code: number;
  dentition: Dentition;
  arch: Arch;
  quadrant: number;
  position: number;
  type: ToothType;
}

export interface Surface {
  code: SurfaceCode;
  name: string;
}

export interface DentalCondition {
  id: number;
  code: string;
  name: string;
  category: ConditionCategory;
  scope: ConditionScope;
  gradeMin: number | null;
  gradeMax: number | null;
  symbols: DentalSymbol[];
}

export interface OdontogramCatalog {
  teeth: Tooth[];
  surfaces: Surface[];
  conditions: DentalCondition[];
}

export interface Finding {
  id: string;
  toothCode: number;
  endToothCode: number | null;
  surfaceCode: SurfaceCode | null;
  surfaceLabel: string | null;
  conditionId: number;
  status: FindingStatus;
  grade: number | null;
  notes: string | null;
  createdAt: string;
  symbol: DentalSymbol;
}

export interface DentalIndices {
  cpoC: number;
  cpoP: number;
  cpoO: number;
  cpoTotal: number;
  ceoC: number;
  ceoE: number;
  ceoO: number;
  ceoTotal: number;
}

export interface PatientOdontogram {
  patientId: string;
  findings: Finding[];
  indices: DentalIndices;
  cariesSurfaces: Record<string, number>;
}

export interface CreateFindingRequest {
  toothCode: number;
  endToothCode?: number | null;
  surfaceCode?: SurfaceCode | null;
  conditionId: number;
  status: FindingStatus;
  grade?: number | null;
  notes?: string | null;
}

