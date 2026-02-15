import { Navigate, useParams } from "react-router-dom";

export default function MatchShareRedirectPage() {
  const { matchId } = useParams<{ matchId: string }>();

  // Note for non-coders: shared match links can be opened from chat apps.
  // We forward them into the normal history page so the web app still works
  // even when the native app is not installed.
  if (!matchId) {
    return <Navigate to="/history" replace />;
  }

  return <Navigate to={`/history?match=${encodeURIComponent(matchId)}`} replace />;
}
