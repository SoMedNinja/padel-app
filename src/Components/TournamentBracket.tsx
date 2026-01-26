import React from 'react';
import { idsToNames } from '../utils/profileMap';
import { Profile, TournamentRound } from '../types';

interface TournamentBracketProps {
  rounds: TournamentRound[];
  profileMap: Map<string, Profile>;
  activeTournament?: any;
}

export default function TournamentBracket({ rounds, profileMap }: TournamentBracketProps) {
  if (!rounds || rounds.length === 0) {
    return <div className="muted">Inga ronder har skapats än.</div>;
  }

  const sortedRounds = [...rounds].sort((a, b) => a.round_number - b.round_number);

  return (
    <div className="tournament-bracket">
      <h3>Turneringsöversikt</h3>
      <div className="bracket-scroll">
        <div className="bracket-container">
          {sortedRounds.map((round) => {
            const isPlayed = round.team1_score !== null && round.team2_score !== null && round.team1_score !== undefined && round.team2_score !== undefined;
            const t1Names = idsToNames(round.team1_ids, profileMap).join(" & ");
            const t2Names = idsToNames(round.team2_ids, profileMap).join(" & ");

            return (
              <div key={round.id} className="bracket-round">
                <div className="bracket-round-header">Rond {round.round_number}</div>
                <div className={`bracket-match ${isPlayed ? 'is-played' : ''}`}>
                  <div className="bracket-team">
                    <span className="bracket-team-name">{t1Names}</span>
                    <span className="bracket-score">{round.team1_score ?? '-'}</span>
                  </div>
                  <div className="bracket-divider">vs</div>
                  <div className="bracket-team">
                    <span className="bracket-team-name">{t2Names}</span>
                    <span className="bracket-score">{round.team2_score ?? '-'}</span>
                  </div>
                </div>
                {round.resting_ids && round.resting_ids.length > 0 && (
                  <div className="bracket-resting">
                    <span className="muted">Vilar: </span>
                    {idsToNames(round.resting_ids, profileMap).join(", ")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
