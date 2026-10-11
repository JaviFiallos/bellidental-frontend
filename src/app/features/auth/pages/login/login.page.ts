import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { SessionStore } from '../../../../core/auth/session.store';
import { ApiError } from '../../../../core/api/api.models';
import { FieldComponent } from '../../../../shared/components/field/field.component';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, FieldComponent, AlertComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly sessionStore = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  readonly showPassword = signal(false);
  readonly isLoading = signal(false);
  readonly submitted = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly isExpired = signal(this.route.snapshot.queryParamMap.get('expirada') === '1');

  readonly emailError = computed(() => {
    const ctrl = this.loginForm.controls.email;
    if (!ctrl.touched && !this.submitted()) return null;
    if (ctrl.hasError('required')) return 'El correo electrónico es obligatorio.';
    if (ctrl.hasError('email')) return 'Ingresa un correo electrónico válido.';
    return null;
  });

  readonly passwordError = computed(() => {
    const ctrl = this.loginForm.controls.password;
    if (!ctrl.touched && !this.submitted()) return null;
    if (ctrl.hasError('required')) return 'La contraseña es obligatoria.';
    return null;
  });

  togglePasswordVisibility(): void {
    this.showPassword.update((val) => !val);
  }

  onSubmit(): void {
    this.submitted.set(true);
    this.errorMessage.set(null);

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    if (this.isLoading()) return;

    this.isLoading.set(true);
    const { email, password } = this.loginForm.getRawValue();

    this.authService.login({ email, password }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate([this.sessionStore.homeRoute()]);
      },
      error: (err: ApiError) => {
        this.isLoading.set(false);
        if (err.status === 401) {
          this.errorMessage.set('Correo o contraseña incorrectos.');
        } else {
          this.errorMessage.set(err.message);
        }
      },
    });
  }
}
