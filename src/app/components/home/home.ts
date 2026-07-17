import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { ThemeController } from '@layout/theme-controller/theme-controller';
import { UserStore } from '@stores/user/user.store';

@Component({
  selector: 'app-home',
  imports: [ThemeController],
  templateUrl: './home.html',
})
export class Home {
  private readonly userStore = inject(UserStore);
  private readonly router = inject(Router);

  protected readonly user = this.userStore.user;

  logout(): void {
    this.userStore.clearSession();
    void this.router.navigate(['/login']);
  }
}
