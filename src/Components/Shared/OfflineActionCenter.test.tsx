import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import OfflineActionCenter from './OfflineActionCenter';
import { useMatchSyncStatus } from '../../hooks/useMatchSyncStatus';
import { matchService } from '../../services/matchService';
import '@testing-library/jest-dom';

// Mock dependencies
vi.mock('../../hooks/useMatchSyncStatus');
vi.mock('../../services/matchService', () => ({
  matchService: {
    getQueueItems: vi.fn(),
    flushMutationQueue: vi.fn(),
  },
}));

// Mock Material UI icons to avoid issues with ESM/CJS if any
vi.mock('@mui/icons-material', () => ({
  CloudQueue: () => <div data-testid="CloudQueue" />,
  CloudOff: () => <div data-testid="CloudOff" />,
  SyncProblem: () => <div data-testid="SyncProblem" />,
  ExpandMore: () => <div data-testid="ExpandMore" />,
  ExpandLess: () => <div data-testid="ExpandLess" />,
  Refresh: () => <div data-testid="Refresh" />,
  ErrorOutline: () => <div data-testid="ErrorOutline" />,
  CheckCircle: () => <div data-testid="CheckCircle" />,
}));

describe('OfflineActionCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when synced', () => {
    (useMatchSyncStatus as any).mockReturnValue({
      status: 'synced',
      pendingCount: 0,
      failedCount: 0,
      lastError: null,
    });

    const { container } = render(<OfflineActionCenter />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders pending state', () => {
    (useMatchSyncStatus as any).mockReturnValue({
      status: 'pending',
      pendingCount: 1,
      failedCount: 0,
      lastError: null,
    });
    (matchService.getQueueItems as any).mockReturnValue([
      {
        queueId: '1',
        attempts: 0,
        payload: [{ team1: ['Team A'], team2: ['Team B'], team1_sets: 6, team2_sets: 4 }]
      }
    ]);

    render(<OfflineActionCenter />);
    expect(screen.getByText('Offline-kö aktiv')).toBeInTheDocument();
    expect(screen.getByText('1 ändringar väntar på uppladdning.')).toBeInTheDocument();
  });

  it('renders failed state', () => {
    (useMatchSyncStatus as any).mockReturnValue({
      status: 'failed',
      pendingCount: 1,
      failedCount: 1,
      lastError: 'Network error',
    });
    (matchService.getQueueItems as any).mockReturnValue([
      {
        queueId: '1',
        attempts: 1,
        payload: [{ team1: ['Team A'], team2: ['Team B'], team1_sets: 6, team2_sets: 4 }]
      }
    ]);

    render(<OfflineActionCenter />);
    expect(screen.getByText('Synkronisering stoppad')).toBeInTheDocument();
    expect(screen.getByText('1 ändringar kunde inte skickas.')).toBeInTheDocument();
  });
});
