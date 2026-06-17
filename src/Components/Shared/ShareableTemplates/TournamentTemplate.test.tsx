import React from 'react';
import { render, screen } from '@testing-library/react';
import { TournamentTemplate } from './TournamentTemplate';
import { Tournament, TournamentResult } from '../../../types';
import { TournamentPlayerStats } from '../../../utils/tournamentLogic';
import '@testing-library/jest-dom';

const mockTournament: Tournament = {
  id: 't1',
  name: 'Test Tournament',
  status: 'completed',
  completed_at: '2023-10-27T12:00:00Z',
};

const mockProfileMap = {
  'p1': 'Player One',
  'p2': 'Player Two',
};

// Shape 1: TournamentResult (from DB)
const mockResultsDB: TournamentResult[] = [
  {
    id: 'r1',
    profile_id: 'p1',
    points_for: 100,
    points_against: 50,
    wins: 5,
    losses: 0,
    matches_played: 5,
    rank: 1,
    tournament_id: 't1',
    created_at: '2023-10-27T12:00:00Z',
  },
  {
    id: 'r2',
    profile_id: 'p2',
    points_for: 80,
    points_against: 70,
    wins: 3,
    losses: 2,
    matches_played: 5,
    rank: 2,
    tournament_id: 't1',
    created_at: '2023-10-27T12:00:00Z',
  },
];

// Shape 2: TournamentPlayerStats (from calculation)
const mockResultsStats: TournamentPlayerStats[] = [
  {
    id: 'p1', // profile ID
    totalPoints: 100,
    pointsFor: 100,
    pointsAgainst: 50,
    wins: 5,
    ties: 0,
    losses: 0,
    gamesPlayed: 5,
    rests: 0,
  },
  {
    id: 'p2', // profile ID
    totalPoints: 80,
    pointsFor: 80,
    pointsAgainst: 70,
    wins: 3,
    ties: 0,
    losses: 2,
    gamesPlayed: 5,
    rests: 0,
  },
];

describe('TournamentTemplate', () => {
  it('renders correctly with TournamentResult data', () => {
    render(
      <TournamentTemplate
        tournament={mockTournament}
        results={mockResultsDB}
        profileMap={mockProfileMap}
        variant={0}
      />
    );

    expect(screen.getByText('Test Tournament')).toBeInTheDocument();
    expect(screen.getAllByText('Player One').length).toBeGreaterThan(0);
    expect(screen.getByText('100 Poäng • 5 Vinster')).toBeInTheDocument();
  });

  it('renders correctly with TournamentPlayerStats data', () => {
    render(
      <TournamentTemplate
        tournament={mockTournament}
        results={mockResultsStats}
        profileMap={mockProfileMap}
        variant={0}
      />
    );

    expect(screen.getByText('Test Tournament')).toBeInTheDocument();
    expect(screen.getAllByText('Player One').length).toBeGreaterThan(0);
    expect(screen.getByText('100 Poäng • 5 Vinster')).toBeInTheDocument();
  });

  it('handles mixed or missing data gracefully', () => {
     render(
      <TournamentTemplate
        tournament={mockTournament}
        results={[]}
        profileMap={mockProfileMap}
        variant={0}
      />
    );
    expect(screen.getByText('Test Tournament')).toBeInTheDocument();
    // Should handle missing winner gracefully
    expect(screen.getByText('Okänd spelare')).toBeInTheDocument();
  });
});
