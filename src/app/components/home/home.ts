import { DatePipe, DecimalPipe } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { HugeiconsIconComponent } from '@hugeicons/angular';
import { Calendar03Icon, RefreshIcon } from '@hugeicons/core-free-icons';

import { ClientsStatsModel } from '@components/clients/client.models';
import {
  SentNotificationModel,
  SentNotificationRecipientModel,
} from '@components/notifications/notification.models';
import { ScheduledNotificationModel } from '@components/scheduled/scheduled.models';
import { AnalyticsService } from '@services/analytics/analytics.service';
import { ClientService } from '@services/clients/client.service';
import { NotificationService } from '@services/notifications/notification.service';
import { ScheduledService } from '@services/scheduled/scheduled.service';
import { UserStore } from '@stores/user/user.store';
import { AnalyticsChannel, AnalyticsSummaryModel, AnalyticsTrendModel } from './home.models';

const CHANNEL_LABELS: Record<AnalyticsChannel, string> = {
  email: 'Email',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  all: 'Tous les clients',
  clientId: 'Client unique',
  filter: 'Segment filtré',
};

interface ChartGeometry {
  width: number;
  height: number;
  points: Record<AnalyticsChannel, string>;
  firstLabel: string;
  lastLabel: string;
  midLabel: string;
}

interface DonutSegment {
  dasharray: string;
  dashoffset: number;
  pct: number;
}

@Component({
  selector: 'app-home',
  imports: [RouterLink, DatePipe, DecimalPipe, HugeiconsIconComponent],
  templateUrl: './home.html',
})
export class Home {
  private readonly destroyRef = inject(DestroyRef);
  private readonly userStore = inject(UserStore);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly clientService = inject(ClientService);
  private readonly notificationService = inject(NotificationService);
  private readonly scheduledService = inject(ScheduledService);

  protected readonly user = this.userStore.user;

  protected readonly channels: AnalyticsChannel[] = ['email', 'sms', 'whatsapp'];
  protected readonly channelLabels = CHANNEL_LABELS;
  protected readonly targetTypeLabels = TARGET_TYPE_LABELS;

  protected readonly RefreshIcon = RefreshIcon;
  protected readonly Calendar03Icon = Calendar03Icon;

  protected readonly summary = signal<AnalyticsSummaryModel | null>(null);
  protected readonly summaryLoading = signal(true);
  protected readonly summaryFailed = signal(false);

  protected readonly trend = signal<AnalyticsTrendModel | null>(null);
  protected readonly trendLoading = signal(true);
  protected readonly trendFailed = signal(false);

  protected readonly clientsStats = signal<ClientsStatsModel | null>(null);
  protected readonly clientsStatsLoading = signal(true);
  protected readonly clientsStatsFailed = signal(false);

  protected readonly upcomingScheduled = signal<ScheduledNotificationModel[]>([]);
  protected readonly scheduledLoading = signal(true);
  protected readonly scheduledFailed = signal(false);

  protected readonly recentNotifications = signal<SentNotificationModel[]>([]);
  protected readonly recentLoading = signal(true);
  protected readonly recentFailed = signal(false);

  protected readonly recipientsDialog =
    viewChild<ElementRef<HTMLDialogElement>>('recipientsDialog');
  protected readonly recipientsModalLoading = signal(false);
  protected readonly recipientsModalFailed = signal(false);
  protected readonly recipientsModalRecipients = signal<SentNotificationRecipientModel[]>([]);

  protected readonly kpis = computed(() => {
    const s = this.summary();
    if (!s) {
      return null;
    }
    const counts = this.channels.map((channel) => s.byChannel[channel]);
    const totalAll = counts.reduce((sum, c) => sum + c.total, 0);
    const deliveredAll = counts.reduce((sum, c) => sum + c.delivered, 0);
    const failedAll = counts.reduce((sum, c) => sum + c.failed, 0);
    const rate = totalAll > 0 ? Math.round((deliveredAll / totalAll) * 1000) / 10 : 0;
    return { totalAll, deliveredAll, failedAll, rate };
  });

  protected readonly channelRows = computed(() => {
    const s = this.summary();
    if (!s) {
      return [];
    }
    return this.channels.map((channel) => {
      const counts = s.byChannel[channel];
      const rate = counts.total > 0 ? Math.round((counts.delivered / counts.total) * 1000) / 10 : 0;
      return { channel, ...counts, rate };
    });
  });

  protected readonly donut = computed<{
    total: number;
    segments: Record<AnalyticsChannel, DonutSegment>;
  } | null>(() => {
    const s = this.summary();
    if (!s) {
      return null;
    }
    const values = this.channels.map((channel) => s.byChannel[channel].sent);
    const total = values.reduce((sum, v) => sum + v, 0);
    if (total === 0) {
      return null;
    }
    const radius = 46;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    const segments = {} as Record<AnalyticsChannel, DonutSegment>;
    this.channels.forEach((channel) => {
      const value = s.byChannel[channel].sent;
      const length = (value / total) * circumference;
      segments[channel] = {
        dasharray: `${length} ${circumference - length}`,
        dashoffset: -offset,
        pct: Math.round((value / total) * 100),
      };
      offset += length;
    });
    return { total, segments };
  });

  protected readonly chart = computed<ChartGeometry | null>(() => {
    const t = this.trend();
    if (!t || t.series.length === 0) {
      return null;
    }
    const width = 640;
    const height = 200;
    const max = Math.max(1, ...t.series.flatMap((p) => [p.email, p.sms, p.whatsapp]));
    const n = t.series.length;
    const stepX = n > 1 ? width / (n - 1) : 0;
    const toY = (value: number) => height - (value / max) * height;
    const buildPoints = (channel: AnalyticsChannel) =>
      t.series.map((p, i) => `${i * stepX},${toY(p[channel])}`).join(' ');
    return {
      width,
      height,
      points: {
        email: buildPoints('email'),
        sms: buildPoints('sms'),
        whatsapp: buildPoints('whatsapp'),
      },
      firstLabel: t.series[0].date,
      lastLabel: t.series[n - 1].date,
      midLabel: t.series[Math.floor(n / 2)].date,
    };
  });

  protected readonly optInBar = computed(() => {
    const c = this.clientsStats();
    if (!c || c.total === 0) {
      return null;
    }
    return {
      email: (c.optIn.email / c.total) * 100,
      sms: (c.optIn.sms / c.total) * 100,
      whatsapp: (c.optIn.whatsapp / c.total) * 100,
    };
  });

  constructor() {
    this.loadAll();
  }

  loadAll(): void {
    this.loadSummary();
    this.loadTrend();
    this.loadClientsStats();
    this.loadUpcomingScheduled();
    this.loadRecentNotifications();
  }

  openRecipientsModal(notificationId: string): void {
    this.recipientsModalLoading.set(true);
    this.recipientsModalFailed.set(false);
    this.recipientsModalRecipients.set([]);
    this.recipientsDialog()?.nativeElement.showModal();
    this.notificationService
      .getById(notificationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.recipientsModalRecipients.set(response.object.recipients);
          this.recipientsModalLoading.set(false);
        },
        error: () => {
          this.recipientsModalFailed.set(true);
          this.recipientsModalLoading.set(false);
        },
      });
  }

  closeRecipientsModal(): void {
    this.recipientsDialog()?.nativeElement.close();
  }

  recipientStatusBadgeClass(status: string): string {
    const normalized = status.toLowerCase();
    if (normalized === 'delivered' || normalized === 'sent') {
      return 'badge-success';
    }
    if (normalized === 'queued') {
      return 'badge-warning';
    }
    if (normalized === 'failed') {
      return 'badge-error';
    }
    return 'badge-ghost';
  }

  rateBadgeClass(rate: number): string {
    if (rate >= 95) {
      return 'text-success';
    }
    if (rate >= 85) {
      return 'text-warning';
    }
    return 'text-error';
  }

  rateBarClass(rate: number): string {
    if (rate >= 95) {
      return 'bg-success';
    }
    if (rate >= 85) {
      return 'bg-warning';
    }
    return 'bg-error';
  }

  channelBgClass(channel: string): string {
    if (channel === 'email') {
      return 'bg-primary';
    }
    if (channel === 'sms') {
      return 'bg-secondary';
    }
    if (channel === 'whatsapp') {
      return 'bg-info';
    }
    return 'bg-neutral';
  }

  channelTextClass(channel: string): string {
    if (channel === 'email') {
      return 'text-primary';
    }
    if (channel === 'sms') {
      return 'text-secondary';
    }
    if (channel === 'whatsapp') {
      return 'text-info';
    }
    return 'text-neutral';
  }

  channelLabel(channel: string): string {
    if (channel === 'email') {
      return 'Email';
    }
    if (channel === 'sms') {
      return 'SMS';
    }
    if (channel === 'whatsapp') {
      return 'WhatsApp';
    }
    if (channel === 'multi') {
      return 'Multi-canal';
    }
    return channel;
  }

  private loadSummary(): void {
    this.summaryLoading.set(true);
    this.summaryFailed.set(false);
    this.analyticsService
      .summary()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.summary.set(response.object);
          this.summaryLoading.set(false);
        },
        error: () => {
          this.summaryFailed.set(true);
          this.summaryLoading.set(false);
        },
      });
  }

  private loadTrend(): void {
    this.trendLoading.set(true);
    this.trendFailed.set(false);
    this.analyticsService
      .trend(30)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.trend.set(response.object);
          this.trendLoading.set(false);
        },
        error: () => {
          this.trendFailed.set(true);
          this.trendLoading.set(false);
        },
      });
  }

  private loadClientsStats(): void {
    this.clientsStatsLoading.set(true);
    this.clientsStatsFailed.set(false);
    this.clientService
      .stats()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.clientsStats.set(response.object);
          this.clientsStatsLoading.set(false);
        },
        error: () => {
          this.clientsStatsFailed.set(true);
          this.clientsStatsLoading.set(false);
        },
      });
  }

  private loadUpcomingScheduled(): void {
    this.scheduledLoading.set(true);
    this.scheduledFailed.set(false);
    this.scheduledService
      .list({ tab: 'upcoming', limit: 4 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.upcomingScheduled.set(response.objects);
          this.scheduledLoading.set(false);
        },
        error: () => {
          this.scheduledFailed.set(true);
          this.scheduledLoading.set(false);
        },
      });
  }

  private loadRecentNotifications(): void {
    this.recentLoading.set(true);
    this.recentFailed.set(false);
    this.notificationService
      .list({ limit: 5 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.recentNotifications.set(response.objects);
          this.recentLoading.set(false);
        },
        error: () => {
          this.recentFailed.set(true);
          this.recentLoading.set(false);
        },
      });
  }
}
