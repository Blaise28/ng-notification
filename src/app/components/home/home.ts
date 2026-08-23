import { DatePipe, DecimalPipe } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { Chart, type ChartConfiguration, type Plugin, registerables } from 'chart.js';

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
import { ThemeStore } from '@stores/theme/theme.store';
import { UserStore } from '@stores/user/user.store';
import { AnalyticsChannel, AnalyticsSummaryModel, AnalyticsTrendModel } from './home.models';

Chart.register(...registerables);

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

/** Theme hexes lifted from styles.css (resyst-light / resyst-dark) — Chart.js paints on a
 * canvas, so it needs literal colors rather than CSS custom properties. */
const CHART_THEME = {
  light: {
    primary: '#354464',
    secondary: '#8fa0b8',
    info: '#89e0eb',
    grid: '#e4e4e4',
    text: '#354464',
    cardBg: '#f7f9fa',
  },
  dark: {
    primary: '#a4c3e7',
    secondary: '#4e5c7b',
    info: '#89e0eb',
    grid: '#354464',
    text: '#ffffff',
    cardBg: '#1e2d45',
  },
};

function centerTextPlugin(total: number, textColor: string): Plugin<'doughnut'> {
  return {
    id: 'centerText',
    afterDraw(chart) {
      const { ctx, chartArea } = chart;
      if (!chartArea) {
        return;
      }
      const x = (chartArea.left + chartArea.right) / 2;
      const y = (chartArea.top + chartArea.bottom) / 2;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = textColor;
      ctx.font = '700 19px system-ui, sans-serif';
      ctx.fillText(new Intl.NumberFormat('fr-FR').format(total), x, y - 8);
      ctx.globalAlpha = 0.55;
      ctx.font = '400 10px system-ui, sans-serif';
      ctx.fillText('envois', x, y + 10);
      ctx.restore();
    },
  };
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
  private readonly themeStore = inject(ThemeStore);

  protected readonly isDark = computed(() => this.themeStore.isDark());

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

  protected readonly trendCanvas = viewChild<ElementRef<HTMLCanvasElement>>('trendCanvas');
  protected readonly donutCanvas = viewChild<ElementRef<HTMLCanvasElement>>('donutCanvas');
  private trendChartInstance?: Chart<'line'>;
  private donutChartInstance?: Chart<'doughnut'>;

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

  /** Percentages for the legend list beside the donut chart (the canvas itself carries the slices). */
  protected readonly donutPct = computed<Record<AnalyticsChannel, number> | null>(() => {
    const s = this.summary();
    if (!s) {
      return null;
    }
    const values = this.channels.map((channel) => s.byChannel[channel].sent);
    const total = values.reduce((sum, v) => sum + v, 0);
    if (total === 0) {
      return null;
    }
    const result = {} as Record<AnalyticsChannel, number>;
    this.channels.forEach((channel) => {
      result[channel] = Math.round((s.byChannel[channel].sent / total) * 100);
    });
    return result;
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
    effect(() => {
      const canvasRef = this.trendCanvas();
      const t = this.trend();
      const colors = this.isDark() ? CHART_THEME.dark : CHART_THEME.light;
      if (!canvasRef) {
        return;
      }
      if (!t || t.series.length === 0) {
        this.trendChartInstance?.destroy();
        this.trendChartInstance = undefined;
        return;
      }
      const labels = t.series.map((p) => p.date);
      const data: ChartConfiguration<'line'>['data'] = {
        labels,
        datasets: [
          this.trendDataset(
            'Email',
            t.series.map((p) => p.email),
            colors.primary,
          ),
          this.trendDataset(
            'SMS',
            t.series.map((p) => p.sms),
            colors.secondary,
          ),
          this.trendDataset(
            'WhatsApp',
            t.series.map((p) => p.whatsapp),
            colors.info,
          ),
        ],
      };
      const options: ChartConfiguration<'line'>['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: colors.text,
              maxTicksLimit: 6,
              font: { size: 11 },
              callback: (_value, index) => this.formatDay(labels[index]),
            },
          },
          y: {
            beginAtZero: true,
            grid: { color: colors.grid },
            ticks: { color: colors.text, font: { size: 11 }, precision: 0 },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => this.formatDay(items[0]?.label ?? ''),
            },
          },
        },
      };
      if (this.trendChartInstance) {
        this.trendChartInstance.data = data;
        this.trendChartInstance.options = options ?? {};
        this.trendChartInstance.update();
      } else {
        this.trendChartInstance = new Chart(canvasRef.nativeElement, {
          type: 'line',
          data,
          options,
        });
      }
    });

    effect(() => {
      const canvasRef = this.donutCanvas();
      const s = this.summary();
      const colors = this.isDark() ? CHART_THEME.dark : CHART_THEME.light;
      if (!canvasRef) {
        return;
      }
      const values = this.channels.map((channel) => s?.byChannel[channel].sent ?? 0);
      const total = values.reduce((sum, v) => sum + v, 0);
      if (!s || total === 0) {
        this.donutChartInstance?.destroy();
        this.donutChartInstance = undefined;
        return;
      }
      const data: ChartConfiguration<'doughnut'>['data'] = {
        labels: this.channels.map((channel) => this.channelLabels[channel]),
        datasets: [
          {
            data: values,
            backgroundColor: [colors.primary, colors.secondary, colors.info],
            borderColor: colors.cardBg,
            borderWidth: 2,
            hoverOffset: 4,
          },
        ],
      };
      const options: ChartConfiguration<'doughnut'>['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const value = typeof ctx.parsed === 'number' ? ctx.parsed : 0;
                const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                return ` ${ctx.label}: ${value} (${pct}%)`;
              },
            },
          },
        },
      };
      if (this.donutChartInstance) {
        this.donutChartInstance.data = data;
        this.donutChartInstance.options = options ?? {};
        this.donutChartInstance.update();
      } else {
        this.donutChartInstance = new Chart(canvasRef.nativeElement, {
          type: 'doughnut',
          data,
          options,
          plugins: [centerTextPlugin(total, colors.text)],
        });
      }
    });

    this.destroyRef.onDestroy(() => {
      this.trendChartInstance?.destroy();
      this.donutChartInstance?.destroy();
    });

    this.loadAll();
  }

  private trendDataset(label: string, data: number[], color: string) {
    return {
      label,
      data,
      borderColor: color,
      backgroundColor: color,
      tension: 0.3,
      pointRadius: 0,
      pointHoverRadius: 4,
      borderWidth: 2,
    };
  }

  private formatDay(iso: string): string {
    if (!iso) {
      return '';
    }
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(
      new Date(iso),
    );
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
