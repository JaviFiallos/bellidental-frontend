import { Routes } from '@angular/router';
import { ReceptionAgendaPage } from './pages/reception-agenda/reception-agenda.page';

export const appointmentsRoutes: Routes = [
  {
    path: 'horarios',
    loadComponent: () =>
      import('./pages/schedules/schedules.page').then((m) => m.SchedulesPage),
  },
  {
    path: '',
    component: ReceptionAgendaPage,
  },
];
