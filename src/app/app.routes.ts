import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { homeRedirectGuard } from './core/guards/home-redirect.guard';
import { profileGuard } from './core/guards/profile.guard';
import { MainLayout } from './layout/main-layout/main-layout';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.authRoutes),
  },
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        canActivate: [homeRedirectGuard],
        children: [],
      },
      {
        path: 'recepcion',
        canActivate: [profileGuard('SECRETARIA')],
        loadChildren: () =>
          import('./features/appointments/appointments.routes').then((m) => m.appointmentsRoutes),
      },
      {
        path: 'pacientes/nuevo',
        canActivate: [profileGuard('SECRETARIA')],
        loadComponent: () =>
          import('./features/patients/pages/patient-form/patient-form.page').then(
            (m) => m.PatientFormPage
          ),
      },
      {
        path: 'pacientes/:id/editar',
        canActivate: [profileGuard('SECRETARIA')],
        loadComponent: () =>
          import('./features/patients/pages/patient-form/patient-form.page').then(
            (m) => m.PatientFormPage
          ),
      },
      {
        path: 'pacientes/:id/033',
        canActivate: [profileGuard('ODONTOLOGO', 'DIRECTOR')],
        loadComponent: () =>
          import('./features/clinical/pages/form-033/form-033.page').then(
            (m) => m.Form033Page
          ),
      },
      {
        path: 'pacientes/:id',
        loadComponent: () =>
          import('./features/patients/pages/patient-reception/patient-reception.page').then(
            (m) => m.PatientReceptionPage
          ),
      },
      {
        path: 'consultorio',
        canActivate: [profileGuard('ODONTOLOGO', 'DIRECTOR')],
        loadComponent: () =>
          import('./features/dashboard/pages/dentist-board/dentist-board.page').then(
            (m) => m.DentistBoardPage
          ),
      },
      {
        path: 'consultorio/atenciones',
        canActivate: [profileGuard('ODONTOLOGO', 'DIRECTOR')],
        loadComponent: () =>
          import('./features/clinical/pages/my-encounters/my-encounters.page').then(
            (m) => m.MyEncountersPage
          ),
      },
      {
        path: 'consultorio/atencion/:encounterId',
        canActivate: [profileGuard('ODONTOLOGO', 'DIRECTOR')],
        loadComponent: () =>
          import('./features/clinical/pages/encounter/encounter.page').then(
            (m) => m.EncounterPage
          ),
      },
      {
        path: 'direccion/estadisticas',
        canActivate: [profileGuard('DIRECTOR')],
        loadComponent: () =>
          import('./features/management/pages/clinic-stats/clinic-stats.page').then(
            (m) => m.ClinicStatsPage
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
