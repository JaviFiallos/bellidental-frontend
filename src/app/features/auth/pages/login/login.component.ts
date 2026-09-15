import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../../core/auth/auth.service';
import { AuthStateService } from '../../../../core/auth/auth-state.service';
import { LoginRequest } from '../../../../core/auth/auth.models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private authService = inject(AuthService);
  private authState = inject(AuthStateService);
  private router = inject(Router);

  // Estado del formulario
  credentials: LoginRequest = { username: '', password: '' };
  rememberMe = false;

  // Estado de UI
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  showPassword = signal(false);

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  onSubmit(): void {
    if (!this.credentials.username || !this.credentials.password) {
      this.errorMessage.set('Por favor, completa todos los campos.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.login(this.credentials).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        if (response.success && response.data) {
          this.authState.setSession(response.data);
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage.set(response.message ?? 'Error al iniciar sesión.');
        }
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        if (err.status === 401) {
          this.errorMessage.set('Usuario o contraseña incorrectos.');
        } else if (err.status === 0) {
          this.errorMessage.set(
            'No se pudo conectar al servidor. Verifica tu conexión.'
          );
        } else {
          this.errorMessage.set(
            err.error?.message ?? 'Ocurrió un error inesperado.'
          );
        }
      },
    });
  }
}
