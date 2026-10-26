/** Tratamiento de `GET /api/v1/treatments/manage` (activos e inactivos, por código). */
export interface CatalogTreatment {
  id: number;
  code: string;
  name: string;
  description: string | null;
  basePrice: number;
  /** `null` = «Cualquiera»: el tratamiento no pertenece a una especialidad. */
  specialtyId: number | null;
  active: boolean;
}

/** Especialidad de `GET /api/v1/specialties/manage` (todas, por nombre). */
export interface CatalogSpecialty {
  id: number;
  name: string;
  /** Múltiplo de 15 entre 15 y 240. */
  defaultDurationMinutes: number;
  active: boolean;
}

/** Cuerpo de `POST /api/v1/treatments`. `description` y `specialtyId` solo se envían si tienen valor. */
export interface CreateTreatmentRequest {
  code: string;
  name: string;
  description?: string;
  basePrice: number;
  specialtyId?: number;
}

/**
 * Cuerpo de `PUT /api/v1/treatments/{id}`. Sin `code` (no se edita). Sin `specialtyId` se quita la especialidad.
 */
export interface UpdateTreatmentRequest {
  name: string;
  description: string | null;
  basePrice: number;
  specialtyId?: number;
}

/** Resultado del formulario de tratamiento: crear o actualizar, con el cuerpo que corresponde a cada uno. */
export type TreatmentFormResult =
  | { kind: 'create'; request: CreateTreatmentRequest }
  | { kind: 'update'; request: UpdateTreatmentRequest };

/** Cuerpo de `POST /api/v1/specialties` y de `PUT /api/v1/specialties/{id}` (son iguales). */
export interface SpecialtyRequest {
  name: string;
  defaultDurationMinutes: number;
}
