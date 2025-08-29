import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { TruckService } from '../../services/truck.service';
import { ToastService } from '../../services/toast.service';
import { Truck, CreateTruckDTO, UpdateTruckDTO, NamedCode } from '../../models/truck.model';

@Component({
  selector: 'app-truck-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './truck-form.component.html',
  styleUrls: ['./truck-form.component.css'],
})
export class TruckFormComponent implements OnInit, OnDestroy {
  truckForm: FormGroup;
  isEditMode = false;
  truckId: number | null = null;
  loading = false;
  loadingInputs = false;
  submitting = false;
  currentTruck: Truck | null = null;

  brands: NamedCode[] = [];
  models: NamedCode[] = [];
  years: NamedCode[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private truckService: TruckService,
    private toastService: ToastService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.truckForm = this.fb.group({
      licensePlate: [
        '',
        [Validators.required, Validators.pattern(/^[A-Z]{3}[0-9][0-9A-Z][0-9]{2}$/)],
      ],
      brand: ['', Validators.required],
      model: ['', Validators.required],
      manufacturingYear: ['', [Validators.required, Validators.min(1900), Validators.max(2100)]],
    });
  }

  ngOnInit(): void {
    this.loadBrands();
    this.setupFormMode();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupFormMode(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      if (params['id']) {
        this.isEditMode = true;
        this.truckId = +params['id'];
        this.loadingInputs = true;
        this.loadTruckForEdit();
        this.truckForm.removeControl('licensePlate');
      } else {
        this.isEditMode = false;
        this.loadingInputs = false;
        this.truckForm.addControl(
          'licensePlate',
          this.fb.control('', [
            Validators.required,
            Validators.pattern(/^[A-Z]{3}[0-9][0-9A-Z][0-9]{2}$/),
          ])
        );
      }
    });
  }

  private loadTruckForEdit(): void {
    if (!this.truckId) return;

    this.loading = true;
    this.truckService
      .getTruckById(this.truckId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (truck) => {
          this.currentTruck = truck;

          if (this.brands.length > 0) {
            this.setupFormForEdit(truck);
          } else {
            this.truckService
              .getBrands()
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (brands) => {
                  this.brands = brands;
                  this.setupFormForEdit(truck);
                },
                error: () => {
                  this.loading = false;
                },
              });
          }

          this.loading = false;
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  private setupFormForEdit(truck: Truck): void {
    const brand = this.brands.find((b) => b.name === truck.brand);
    if (brand) {
      this.loadModels(brand.code);
      this.truckForm.patchValue({ brand: brand.code });

      this.truckService
        .getModels(brand.code)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (models) => {
            this.models = models;

            const model = models.find((m) => m.name === truck.model);
            if (model) {
              this.loadYears(brand.code, model.code);
              this.truckForm.patchValue({ model: model.code });

              this.truckService
                .getYears(brand.code, model.code)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                  next: (years) => {
                    this.years = years;

                    const year = years.find((y) => {
                      const yearMatch = y.name.match(/\d{4}/);
                      return yearMatch ? parseInt(yearMatch[0]) === truck.manufacturingYear : false;
                    });

                    if (year) {
                      this.truckForm.patchValue({ manufacturingYear: year.code });
                    }

                    this.loadingInputs = false;
                  },
                  error: () => {
                    this.loadingInputs = false;
                  },
                });
            } else {
              this.loadingInputs = false;
            }
          },
          error: () => {
            this.loadingInputs = false;
          },
        });
    } else {
      this.loadingInputs = false;
    }
  }

  private loadBrands(): void {
    this.truckService
      .getBrands()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (brands) => {
          this.brands = brands;
        },
        error: () => {
          // Error handled by TruckService
        },
      });
  }

  onBrandChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const brandCode = target.value;

    this.truckForm.patchValue({ model: '', manufacturingYear: '' });
    this.models = [];
    this.years = [];

    if (brandCode) {
      this.loadModels(brandCode);
    }
  }

  private loadModels(brandCode: string): void {
    this.truckService
      .getModels(brandCode)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (models) => {
          this.models = models;
        },
        error: () => {
          // Error handled by TruckService
        },
      });
  }

  onModelChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const modelCode = target.value;

    this.truckForm.patchValue({ manufacturingYear: '' });
    this.years = [];

    if (modelCode) {
      const brandCode = this.truckForm.get('brand')?.value;
      if (brandCode) {
        this.loadYears(brandCode, modelCode);
      }
    }
  }

  private loadYears(brandCode: string, modelCode: string): void {
    this.truckService
      .getYears(brandCode, modelCode)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (years) => {
          this.years = years;
        },
        error: () => {
          // Error handled by TruckService
        },
      });
  }

  onSubmit(): void {
    if (this.truckForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.submitting = true;
    const formValue = this.truckForm.value;

    const brandName = this.truckService.getBrandNameByCode(formValue.brand, this.brands);
    const modelName = this.truckService.getModelNameByCode(formValue.model, this.models);
    const yearValue = this.truckService.getYearValueByCode(formValue.manufacturingYear, this.years);

    if (this.isEditMode && this.truckId) {
      const updateData: UpdateTruckDTO = {
        brand: brandName,
        model: modelName,
        manufacturingYear: yearValue,
      };

      this.truckService
        .updateTruck(this.truckId, updateData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toastService.showSuccess('Sucesso!', 'Caminhão atualizado com sucesso');
            this.router.navigate(['/trucks']);
          },
          error: () => {
            this.submitting = false;
          },
        });
    } else {
      const createData: CreateTruckDTO = {
        licensePlate: formValue.licensePlate,
        brand: brandName,
        model: modelName,
        manufacturingYear: yearValue,
      };

      this.truckService
        .createTruck(createData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toastService.showSuccess('Sucesso!', 'Caminhão criado com sucesso');
            this.router.navigate(['/trucks']);
          },
          error: () => {
            this.submitting = false;
          },
        });
    }
  }

  onCancel(): void {
    this.router.navigate(['/trucks']);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.truckForm.controls).forEach((key) => {
      const control = this.truckForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.truckForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) return 'Campo obrigatório';
      if (field.errors['pattern']) return 'Formato inválido';
      if (field.errors['min']) return `Valor mínimo: ${field.errors['min'].min}`;
      if (field.errors['max']) return `Valor máximo: ${field.errors['max'].max}`;
    }
    return '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.truckForm.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }
}
