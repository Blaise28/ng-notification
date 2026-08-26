import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { HugeiconsIconComponent } from '@hugeicons/angular';
import { Logout01Icon, UserIcon } from '@hugeicons/core-free-icons';

import { ThemeController } from '@layout/theme-controller/theme-controller';
import { UserStore } from '@stores/user/user.store';

@Component({
  selector: 'app-user-menu',
  imports: [HugeiconsIconComponent, ThemeController],
  templateUrl: './user-menu.html',
})
export class UserMenu {
  private readonly userStore = inject(UserStore);
  private readonly router = inject(Router);

  protected readonly user = this.userStore.user;
  protected readonly open = signal(false);
  protected readonly UserIcon = UserIcon;
  protected readonly Logout01Icon = Logout01Icon;

  // toggle(): void {
  //   this.open.update((value) => !value);
  // }

  // close(): void {
  //   this.open.set(false);
  // }

  logout(): void {
    // this.close();
    this.userStore.clearSession();
    void this.router.navigate(['/login']);
  }
}
