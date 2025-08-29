export interface Truck {
  id: number;
  licensePlate: string;
  brand: string;
  model: string;
  manufacturingYear: number;
  fipePrice: number;
}

export interface CreateTruckDTO {
  licensePlate: string;
  brand: string;
  model: string;
  manufacturingYear: number;
}

export interface UpdateTruckDTO {
  brand: string;
  model: string;
  manufacturingYear: number;
}

export interface NamedCode {
  code: string;
  name: string;
}

export interface ValidationError {
  field: string;
  message: string;
  rejectedValue: any;
}

export interface ApiError {
  code: string;
  message: string;
  details?: string;
  timestamp: string;
  path: string;
  validationErrors?: ValidationError[];
}
