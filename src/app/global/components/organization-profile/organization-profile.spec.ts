import '@angular/compiler';
import { NO_ERRORS_SCHEMA, signal, ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { OrganizationService } from '@services/organization/organization.service';
import { FolderNavStore } from '@stores/folder-navigation/folder-nav.store';
import { OrganizationStore } from '@stores/organisation/organization.store';
import { OrganizationProfile } from './organization-profile';

const organizationProfileResourceRoot = path.resolve(
  process.cwd(),
  'src/app/global/components/organization-profile',
);

beforeAll(async () => {
  await resolveComponentResources(async (url) => {
    const resourcePath = path.join(organizationProfileResourceRoot, url.replace(/^\.\//, ''));
    return readFile(resourcePath, 'utf8');
  });
});

describe('OrganizationProfile', () => {
  let fixture: ComponentFixture<OrganizationProfile>;
  let getUserOrganizations: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    getUserOrganizations = vi.fn();

    await TestBed.configureTestingModule({
      imports: [OrganizationProfile],
      providers: [
        provideRouter([]),
        {
          provide: OrganizationService,
          useValue: {
            getUserOrganizations,
          },
        },
        {
          provide: OrganizationStore,
          useValue: {
            organizations: signal([
              {
                organization: {
                  id: 'org-1',
                  name: 'Acme',
                  slug: 'acme',
                  kind: 'business',
                  plan: 'Free',
                  max_users: 10,
                  is_active: true,
                  created_at: '',
                  updated_at: '',
                },
                user_type: 'admin',
                is_default_org: true,
                is_active: true,
              },
            ]),
            selectedOrganization: signal({
              organization: {
                id: 'org-1',
                name: 'Acme',
                slug: 'acme',
                kind: 'business',
                plan: 'Free',
                max_users: 10,
                is_active: true,
                created_at: '',
                updated_at: '',
              },
              user_type: 'admin',
              is_default_org: true,
              is_active: true,
            }),
          },
        },
        {
          provide: FolderNavStore,
          useValue: {
            resetForOrganizationChange: vi.fn(),
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(OrganizationProfile);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create without fetching organizations', () => {
    expect(fixture.componentInstance).toBeTruthy();
    expect(getUserOrganizations).not.toHaveBeenCalled();
  });

  it('should render the active organization name', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Acme');
  });
});
