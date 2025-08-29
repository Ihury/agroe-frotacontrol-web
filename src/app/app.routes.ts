import { Routes } from '@angular/router';

import { TruckListComponent } from './components/truck-list/truck-list.component';
import { TruckFormComponent } from './components/truck-form/truck-form.component';

export const routes: Routes = [
  { path: '', redirectTo: '/trucks', pathMatch: 'full' },
  { path: 'trucks', component: TruckListComponent },
  { path: 'trucks/new', component: TruckFormComponent },
  { path: 'trucks/:id/edit', component: TruckFormComponent },
];
