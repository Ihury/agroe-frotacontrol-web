import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Truck, CreateTruckDTO, UpdateTruckDTO, NamedCode, ApiError } from '../models/truck.model';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root',
})
export class TruckService {
  private readonly baseUrl = 'http://localhost:8080/api/v1';

  constructor(private http: HttpClient, private toastService: ToastService) {}

  // Caminhões
  getTrucks(): Observable<Truck[]> {
    return this.http
      .get<Truck[]>(`${this.baseUrl}/trucks`)
      .pipe(catchError((error) => this.handleError(error)));
  }

  getTruckById(id: number): Observable<Truck> {
    return this.http
      .get<Truck>(`${this.baseUrl}/trucks/${id}`)
      .pipe(catchError((error) => this.handleError(error)));
  }

  createTruck(truck: CreateTruckDTO): Observable<Truck> {
    return this.http
      .post<Truck>(`${this.baseUrl}/trucks`, truck)
      .pipe(catchError((error) => this.handleError(error)));
  }

  updateTruck(id: number, truck: UpdateTruckDTO): Observable<Truck> {
    return this.http
      .put<Truck>(`${this.baseUrl}/trucks/${id}`, truck)
      .pipe(catchError((error) => this.handleError(error)));
  }

  deleteTruck(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/trucks/${id}`)
      .pipe(catchError((error) => this.handleError(error)));
  }

  // FIPE - Buscando valores reais
  getBrands(): Observable<NamedCode[]> {
    return this.http
      .get<NamedCode[]>(`${this.baseUrl}/fipe/brands`)
      .pipe(catchError((error) => this.handleError(error)));
  }

  getModels(brandId: string): Observable<NamedCode[]> {
    return this.http
      .get<NamedCode[]>(`${this.baseUrl}/fipe/brands/${brandId}/models`)
      .pipe(catchError((error) => this.handleError(error)));
  }

  getYears(brandId: string, modelId: string): Observable<NamedCode[]> {
    return this.http
      .get<NamedCode[]>(`${this.baseUrl}/fipe/brands/${brandId}/models/${modelId}/years`)
      .pipe(catchError((error) => this.handleError(error)));
  }

  // Métodos auxiliares para buscar valores reais
  getBrandNameByCode(brandCode: string, brands: NamedCode[]): string {
    const brand = brands.find((b) => b.code === brandCode);
    return brand ? brand.name : brandCode;
  }

  getModelNameByCode(modelCode: string, models: NamedCode[]): string {
    const model = models.find((m) => m.code === modelCode);
    return model ? model.name : modelCode;
  }

  getYearValueByCode(yearCode: string, years: NamedCode[]): number {
    const year = years.find((y) => y.code === yearCode);
    if (year) {
      // Extrair o ano do nome (ex: "2012 gasolina" -> 2012)
      const yearMatch = year.name.match(/\d{4}/);
      return yearMatch ? parseInt(yearMatch[0]) : parseInt(yearCode);
    }
    return parseInt(yearCode);
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Ocorreu um erro inesperado';
    let errorDetails: string | undefined;

    if (error.error instanceof ErrorEvent) {
      // Erro do cliente
      errorMessage = `Erro: ${error.error.message}`;
    } else {
      // Erro do servidor - tentar extrair da resposta da API Spring
      if (error.error && typeof error.error === 'object') {
        const apiError = error.error as ApiError;
        errorMessage = apiError.message || `Erro ${error.status}: ${error.statusText}`;
        errorDetails = apiError.details;

        // Se houver erros de validação, mostrar o primeiro
        if (apiError.validationErrors && apiError.validationErrors.length > 0) {
          const firstValidationError = apiError.validationErrors[0];
          errorMessage = `Erro de validação: ${firstValidationError.message}`;
          errorDetails = `Campo: ${firstValidationError.field}`;
        }
      } else {
        errorMessage = error.error?.message || `Erro ${error.status}: ${error.statusText}`;
      }
    }

    console.error('Erro na API:', error);

    // Exibir toast de erro
    this.toastService.showError('Erro na API', errorMessage, errorDetails);

    return throwError(() => ({
      message: errorMessage,
      details: errorDetails,
      status: error.status,
    }));
  }
}
