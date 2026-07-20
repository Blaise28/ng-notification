import { Component, computed, DestroyRef, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';

import { HugeiconsIconComponent } from '@hugeicons/angular';
import {
  Folder03Icon,
  IdeaIcon,
  LibraryIcon,
  Logout01Icon,
  Settings02Icon,
  UserIcon,
  ArrowDown01Icon,
} from '@hugeicons/core-free-icons';

import { ThemeController } from '@layout/theme-controller/theme-controller';
import { AuthService } from '@services/auth/auth.service';
import { FolderNavStore } from '@stores/folder-navigation/folder-nav.store';
import { OrganizationStore } from '@stores/organisation/organization.store';
import { ThemeStore } from '@stores/theme/theme.store';
import { UserStore } from '@stores/user/user.store';

@Component({
    selector: 'app-user-profile',
  imports: [HugeiconsIconComponent, ThemeController,RouterLink],
  templateUrl: './user-profile.html',
  styleUrl: './user-profile.scss',
})
export class UserProfile {
  private destroyRef = inject(DestroyRef);

  design = input<'avatar' | 'account'>('avatar');
  dropdownAlign = input<'start' | 'end' | 'center' | 'top' | 'bottom'>('end');

  userIcon = signal(UserIcon);
  folderIcon = signal(Folder03Icon);
  archiveIcon = signal(LibraryIcon);
  settingsIcon = signal(Settings02Icon);
  logoutIcon = signal(Logout01Icon);
  lightIcon = signal(IdeaIcon);
  arrowDownIcon = signal(ArrowDown01Icon);

  private userStore = inject(UserStore);
  private organizationStore = inject(OrganizationStore);
  private folderNavStore = inject(FolderNavStore);
  private themeStore = inject(ThemeStore);
  private router = inject(Router);
  private authService = inject(AuthService);

  user = computed(() => this.userStore.user());
  isDark = computed(() => this.themeStore.isDark());
  userDisplayName = computed(() => {
    const user = this.user();
    const fullName = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim();
    return fullName || 'Account';
  });
  userInitial = computed(() => this.user()?.first_name?.[0]?.toUpperCase() ?? 'U');
  isLoggingOut = signal(false);

  logout(): void {
    this.isLoggingOut.set(true);
    this.authService
      .logout()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.userStore.clearSession();
          this.organizationStore.clear();
          void this.folderNavStore.clearAllFoldersAndFiles();
          void this.router.navigate(['/login']);
          this.isLoggingOut.set(false);
        },
        error: () => {
          this.userStore.clearSession();
          this.organizationStore.clear();
          void this.folderNavStore.clearAllFoldersAndFiles();
          void this.router.navigate(['/login']);
          this.isLoggingOut.set(false);
        },
      });
  }
}
