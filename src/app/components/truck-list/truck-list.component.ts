import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TruckService } from '../../services/truck.service';
import { ToastService } from '../../services/toast.service';
import { Truck, ApiError } from '../../models/truck.model';

@Component({
  selector: 'app-truck-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './truck-list.component.html',
  styleUrls: ['./truck-list.component.css'],
})
export class TruckListComponent implements OnInit {
  trucks: Truck[] = [];
  loading = false;
  error: ApiError | null = null;

  constructor(
    private truckService: TruckService,
    private toastService: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadTrucks();
  }

  loadTrucks(): void {
    this.loading = true;
    this.error = null;

    this.truckService.getTrucks().subscribe({
      next: (trucks) => {
        this.trucks = trucks;
        this.loading = false;
      },
      error: (error: ApiError) => {
        this.error = error;
        this.loading = false;
      },
    });
  }

  editTruck(truck: Truck): void {
    this.router.navigate(['/trucks', truck.id, 'edit']);
  }

  deleteTruck(truck: Truck): void {
    if (confirm(`Tem certeza que deseja excluir o caminhão ${truck.licensePlate}?`)) {
      this.truckService.deleteTruck(truck.id).subscribe({
        next: () => {
          this.trucks = this.trucks.filter((t) => t.id !== truck.id);
          this.toastService.showSuccess('Sucesso!', 'Caminhão excluído com sucesso');
        },
        error: (error: ApiError) => {
          this.error = error;
        },
      });
    }
  }

  addNewTruck(): void {
    this.router.navigate(['/trucks/new']);
  }

  retry(): void {
    this.loadTrucks();
  }
}
