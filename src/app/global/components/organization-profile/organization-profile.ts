import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { HugeiconsIconComponent } from '@hugeicons/angular';
import {
  Add01Icon,
  ArrowDown01Icon,
  CheckmarkBadge02Icon,
  Logout01Icon,
  Search01Icon,
  Settings02Icon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons';

import { DOCUMENT_BROWSER_ROOT_PATH } from '@globals/constants';
import { OrganizationModel } from '@components/auth/auth.models';
import { FolderNavStore } from '@stores/folder-navigation/folder-nav.store';
import { OrganizationStore } from '@stores/organisation/organization.store';

@Component({
  selector: 'app-organization-profile',
  imports: [HugeiconsIconComponent, RouterLink],
  templateUrl: './organization-profile.html',
  styleUrl: './organization-profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationProfile {
  addIcon = signal(Add01Icon);
  arrowDownIcon = signal(ArrowDown01Icon);
  checkIcon = signal(CheckmarkBadge02Icon);
  logoutIcon = signal(Logout01Icon);
  searchIcon = signal(Search01Icon);
  settingsIcon = signal(Settings02Icon);
  inviteIcon = signal(UserGroupIcon);

  private readonly organizationStore = inject(OrganizationStore);
  private readonly folderNavStore = inject(FolderNavStore);
  private readonly router = inject(Router);

  searchTerm = signal('');
  organizations = computed(() => this.organizationStore.organizations());
  selectedOrganization = computed(() => this.organizationStore.selectedOrganization());
  currentOrg = computed<OrganizationModel | null>(() => {
    const selected = this.selectedOrganization();
    if (selected) {
      return selected;
    }
    const organizations = this.organizations();
    return organizations[0] ?? null;
  });

  filteredOrganizations = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    if (!query) {
      return this.organizations();
    }
    return this.organizations().filter((org) =>
      org.organization.name.toLowerCase().includes(query),
    );
  });

  orgInitial(org: OrganizationModel): string {
    return org.organization.name[0]?.toUpperCase() ?? 'O';
  }

  orgFallbackBackground(org: OrganizationModel): string {
    const gradients = [
      'linear-gradient(135deg, #7c3aed, #ec4899)',
      'linear-gradient(135deg, #0ea5e9, #3b82f6)',
      'linear-gradient(135deg, #16a34a, #0d9488)',
      'linear-gradient(135deg, #f59e0b, #ef4444)',
    ] as const;
    const index = this.hash(org.organization.id) % gradients.length;
    return gradients[index];
  }

  orgPlan(org: OrganizationModel): string {
    return org.organization.plan ?? 'Free';
  }

  switchOrg(org: OrganizationModel): void {
    void this.router.navigate([DOCUMENT_BROWSER_ROOT_PATH]);
    this.organizationStore.setSelectedOrganization(org);
    void this.folderNavStore.resetForOrganizationChange();
  }

  createOrg(): void {
    console.log('Create organization');
  }

  manageOrg(): void {
    console.log('Open organization settings');
  }

  invite(): void {
    console.log('Invite members');
  }

  logout(): void {
    console.log('Logout');
  }

  updateSearch(value: string): void {
    this.searchTerm.set(value);
  }

  onSearchInput(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    this.updateSearch(target.value);
  }

  private hash(value: string): number {
    let hash = 0;
    for (let index = 0; index < value.length; index++) {
      hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
    }
    return hash;
  }
}
