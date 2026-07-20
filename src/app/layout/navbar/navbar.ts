import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { HugeiconsIconComponent } from '@hugeicons/angular';
import { Notification02Icon, WifiOff01Icon } from '@hugeicons/core-free-icons';

import { Api } from '@services/api/api';
import { environment } from '@environments/environment';
import { UserMenu } from '@layout/user-menu/user-menu';

@Component({
  selector: 'app-navbar',
  imports: [HugeiconsIconComponent, RouterLink, UserMenu],
  templateUrl: './navbar.html',
})
export class Navbar {
  private readonly api = inject(Api);

  protected readonly appVersion = environment.appVersionUuid;
  protected readonly isOnline = this.api.isOnline;
  protected readonly Notification02Icon = Notification02Icon;
  protected readonly WifiOff01Icon = WifiOff01Icon;
}
