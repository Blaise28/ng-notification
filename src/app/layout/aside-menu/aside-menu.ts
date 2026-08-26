import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';

import { HugeiconsIconComponent, IconSvgObject } from '@hugeicons/angular';
import {
  ArrowLeft02Icon,
  ArrowRight01Icon,
  DashboardSquare01Icon,
  HistoryIcon,
  Image02Icon,
  Megaphone02Icon,
  Note01Icon,
  Notification02Icon,
  UserAccountIcon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons';

import { UserStore } from '@stores/user/user.store';

interface AsideMenuItem {
  label: string;
  url?: string;
  icon: IconSvgObject;
  children?: AsideMenuItem[];
  adminOnly?: boolean;
}

interface AsideMenuSection {
  menus: AsideMenuItem[];
}

@Component({
  selector: 'app-aside-menu',
  imports: [RouterLink, RouterLinkActive, HugeiconsIconComponent],
  templateUrl: './aside-menu.html',
  host: {
    '(keydown.escape)': 'goBack()',
  },
})
export class AsideMenu {
  private readonly userStore = inject(UserStore);
  private readonly router = inject(Router);

  protected readonly isAdmin = computed(() => this.userStore.user()?.role === 'admin');
  protected readonly activeSubmenu = signal<AsideMenuItem | null>(null);
  private lastTrigger: HTMLElement | null = null;

  protected readonly ArrowRight01Icon = ArrowRight01Icon;
  protected readonly ArrowLeft02Icon = ArrowLeft02Icon;

  protected readonly menuSections: AsideMenuSection[] = [
    {
      menus: [
        { label: 'Tableau de bord', url: '', icon: DashboardSquare01Icon },
        { label: 'Clients', url: '/clients', icon: UserGroupIcon },
        { label: 'Modèles', url: '/templates', icon: Note01Icon },
        { label: 'Galerie', url: '/media', icon: Image02Icon },
        {
          label: 'Notifications',
          icon: Notification02Icon,
          children: [
            {
              label: 'Envoyer',
              url: '/notifications/compose',
              icon: Megaphone02Icon,
            },
            { label: 'Historique', url: '/notifications', icon: HistoryIcon },
          ],
        },
        // { label: 'Programmées', url: '/scheduled', icon: Calendar03Icon },
        {
          label: 'Operateurs',
          url: '/users',
          icon: UserAccountIcon,
          adminOnly: true,
        },
      ],
    },
  ];

  constructor() {
    this.checkActiveSubmenu(this.router.url);

    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.checkActiveSubmenu(event.urlAfterRedirects);
      }
    });
  }

  private checkActiveSubmenu(url: string): void {
    for (const section of this.menuSections) {
      for (const menu of section.menus) {
        const isParentActive =
          menu.url !== undefined && (url === menu.url || url.startsWith(menu.url + '/'));
        const hasActiveChild = menu.children?.some(
          (child) => child.url && (url === child.url || url.startsWith(child.url + '/')),
        );

        if (menu.children && (isParentActive || hasActiveChild)) {
          this.activeSubmenu.set(menu);
          return;
        }
      }
    }
  }

  selectSubmenu(menu: AsideMenuItem, trigger: HTMLElement): void {
    if (menu.children) {
      this.lastTrigger = trigger;
      this.activeSubmenu.set(menu);
    }
  }

  goBack(): void {
    if (!this.activeSubmenu()) {
      return;
    }
    this.activeSubmenu.set(null);
    this.lastTrigger?.focus();
  }
}
