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
        path: 'recepcion/horarios',
        canActivate: [profileGuard('SECRETARIA')],
        loadComponent: () =>
          import('./layout/coming-soon/coming-soon.page').then((m) => m.ComingSoonPage),
        data: { title: 'Horarios', task: 'tarea 006' },
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
          import('./layout/coming-soon/coming-soon.page').then((m) => m.ComingSoonPage),
        data: { title: 'Nuevo paciente', task: 'tarea 005' },
      },
      {
        path: 'pacientes/:id',
        loadComponent: () =>
          import('./layout/coming-soon/coming-soon.page').then((m) => m.ComingSoonPage),
        data: { title: 'Ficha del paciente', task: 'tareas 005/014' },
      },
      {
        path: 'consultorio',
        canActivate: [profileGuard('ODONTOLOGO', 'DIRECTOR')],
        loadComponent: () =>
          import('./layout/coming-soon/coming-soon.page').then((m) => m.ComingSoonPage),
        data: { title: 'Mis citas de hoy', task: 'tarea 007' },
      },
      {
        path: 'consultorio/atencion/:encounterId',
        canActivate: [profileGuard('ODONTOLOGO', 'DIRECTOR')],
        loadComponent: () =>
          import('./layout/coming-soon/coming-soon.page').then((m) => m.ComingSoonPage),
        data: { title: 'Atención', task: 'tarea 008' },
      },
      {
        path: 'direccion/estadisticas',
        canActivate: [profileGuard('DIRECTOR')],
        loadComponent: () =>
          import('./layout/coming-soon/coming-soon.page').then((m) => m.ComingSoonPage),
        data: { title: 'Estadísticas', task: 'tarea 016' },
      },
      {
        path: 'direccion/auditoria',
        canActivate: [profileGuard('DIRECTOR')],
        loadComponent: () =>
          import('./layout/coming-soon/coming-soon.page').then((m) => m.ComingSoonPage),
        data: { title: 'Auditoría', task: 'tarea 017' },
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
