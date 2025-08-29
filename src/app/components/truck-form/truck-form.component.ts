import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, switchMap, of } from 'rxjs';
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
        // Definir loading dos inputs imediatamente para evitar flash do formulário vazio
        this.loadingInputs = true;
        this.loadTruckForEdit();
        // Remove placa do formulário em modo de edição
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

          // Aguardar as marcas serem carregadas antes de configurar o formulário
          if (this.brands.length > 0) {
            this.setupFormForEdit(truck);
          } else {
            // Se as marcas ainda não foram carregadas, aguardar
            this.truckService
              .getBrands()
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (brands) => {
                  this.brands = brands;
                  this.setupFormForEdit(truck);
                },
                error: (error) => {
                  // Apenas o toast será exibido pelo TruckService
                },
              });
          }

          this.loading = false;
        },
        error: (error) => {
          // Apenas o toast será exibido pelo TruckService
          this.loading = false;
        },
      });
  }

  private setupFormForEdit(truck: Truck): void {
    // Encontrar os códigos correspondentes aos nomes
    const brand = this.brands.find((b) => b.name === truck.brand);
    if (brand) {
      // Carregar modelos para esta marca
      this.loadModels(brand.code);

      // Configurar o valor da marca no formulário
      this.truckForm.patchValue({ brand: brand.code });

      // Aguardar os modelos serem carregados para configurar o modelo
      this.truckService
        .getModels(brand.code)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (models) => {
            this.models = models;

            // Encontrar o modelo correspondente
            const model = models.find((m) => m.name === truck.model);
            if (model) {
              // Carregar anos para esta marca e modelo
              this.loadYears(brand.code, model.code);

              // Configurar o valor do modelo no formulário
              this.truckForm.patchValue({ model: model.code });

              // Aguardar os anos serem carregados para configurar o ano
              this.truckService
                .getYears(brand.code, model.code)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                  next: (years) => {
                    this.years = years;

                    // Encontrar o ano correspondente
                    const year = years.find((y) => {
                      const yearMatch = y.name.match(/\d{4}/);
                      return yearMatch ? parseInt(yearMatch[0]) === truck.manufacturingYear : false;
                    });

                    if (year) {
                      // Configurar o valor do ano no formulário
                      this.truckForm.patchValue({ manufacturingYear: year.code });
                    }

                    // Finalizar loading dos inputs - todos os dados foram carregados
                    this.loadingInputs = false;
                  },
                  error: (error) => {
                    // Apenas o toast será exibido pelo TruckService
                    this.loadingInputs = false;
                  },
                });
            } else {
              // Se não encontrar o modelo, finalizar loading
              this.loadingInputs = false;
            }
          },
          error: (error) => {
            // Apenas o toast será exibido pelo TruckService
            this.loadingInputs = false;
          },
        });
    } else {
      // Se não encontrar a marca, finalizar loading
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
        error: (error) => {
          // Apenas o toast será exibido pelo TruckService
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
        error: (error) => {
          // Apenas o toast será exibido pelo TruckService
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
        error: (error) => {
          // Apenas o toast será exibido pelo TruckService
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

    // Converter códigos para valores reais (tanto para criação quanto edição)
    const brandName = this.truckService.getBrandNameByCode(formValue.brand, this.brands);
    const modelName = this.truckService.getModelNameByCode(formValue.model, this.models);
    const yearValue = this.truckService.getYearValueByCode(formValue.manufacturingYear, this.years);

    if (this.isEditMode && this.truckId) {
      // Para edição, usar os nomes reais convertidos dos códigos
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
          error: (error) => {
            // Apenas o toast será exibido pelo TruckService
            this.submitting = false;
          },
        });
    } else {
      // Para criação, usar os nomes reais convertidos dos códigos
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
          error: (error) => {
            // Apenas o toast será exibido pelo TruckService
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
