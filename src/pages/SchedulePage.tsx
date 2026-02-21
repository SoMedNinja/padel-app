import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  LinearProgress,
  ListItemText,
  Menu,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
  AvatarGroup,
} from "@mui/material";
// Note for non-coders: IconButton is the small clickable icon used for menus and actions, so it must be imported here.
import Avatar from "../Components/Avatar";
import EmptyState from "../Components/Shared/EmptyState";
import DataFreshnessStatus from "../Components/Shared/DataFreshnessStatus";
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  ExpandMore as ExpandMoreIcon,
  Email as EmailIcon,
  MoreVert as MoreVertIcon,
  Event as EventIcon,
} from "@mui/icons-material";
import PullToRefresh from "react-simple-pull-to-refresh";
import { PullingContent, RefreshingContent } from "../Components/Shared/PullToRefreshContent";
import PageShell from "../Components/Shared/PageShell";
import PageHeader from "../Components/Shared/PageHeader";
import { evaluatePollDay } from "../utils/availabilityStatus";
import { formatShortDate, formatFullDate } from "../utils/format";
import { useScheduleLogic } from "../hooks/useScheduleLogic";
import {
  SLOT_OPTIONS,
  computeEmailAvailability,
  normalizeVoteSlots,
  formatTimeSlice as formatTime,
} from "../utils/scheduleUtils";

export default function SchedulePage() {
  const {
    // Data
    pollsSorted,
    upcomingBookings,
    isLoading,
    isError,
    error,
    isFetchingPolls,
    isFetchingScheduledGames,
    pollsUpdatedAt,
    scheduledGamesUpdatedAt,
    user,
    isGuest,
    canAccessSchema,
    weekOptions,
    selectedWeekKey,
    selectedWeek,
    expandedPolls,
    inviteDialogOpen,
    invitePollId,
    inviteDate,
    inviteStartTime,
    inviteEndTime,
    inviteLocation,
    inviteeProfileIds,
    inviteAction,
    profileDataMap,
    eligibleInvitees,
    dangerPollId,
    confirmDeletePollId,
    actionMenuAnchorEl,
    actionMenuPollId,
    onlyMissingVotesByPoll,
    pullToRefreshTuning,

    // Handlers
    handleRefresh,
    handleWeekStep,
    setSelectedWeekKey,
    togglePollExpanded,
    openActionMenu,
    closeActionMenu,
    openInviteDialog,
    closeInviteDialog,
    handleSendInvite,
    handleToggleDay,
    handleToggleSlot,
    setDangerPollId,
    setConfirmDeletePollId,
    setInviteDate,
    setInviteStartTime,
    setInviteEndTime,
    setInviteLocation,
    setInviteeProfileIds,
    setInviteAction,
    setOnlyMissingVotesByPoll,

    // Mutations
    createPollMutation,
    closePollMutation,
    deletePollMutation,
    sendEmailMutation,
    sendCalendarInviteMutation,
  } = useScheduleLogic();

  return (
    <PullToRefresh
      // Note for non-coders: this class lets us apply iOS-specific CSS so only our custom refresh animation is shown.
      className="app-pull-to-refresh"
      onRefresh={handleRefresh}
      pullingContent={<PullingContent />}
      refreshingContent={<RefreshingContent />}
      {...pullToRefreshTuning}
    >
      <PageShell sectionId="schedule">
        <PageHeader
          title="Schema"
          subtitle="Rösta på de dagar du kan spela. Resultatet uppdateras live för alla."
        />
        <DataFreshnessStatus
          isFetching={isFetchingPolls || isFetchingScheduledGames}
          hasCachedData={pollsSorted.length > 0 || upcomingBookings.length > 0}
          hasError={isError}
          lastUpdatedAt={Math.max(pollsUpdatedAt || 0, scheduledGamesUpdatedAt || 0)}
        />
        {isGuest && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {/* Note for non-coders: guests can read results but cannot submit votes. */}
            Du är i gästläge. Logga in för att rösta.
          </Alert>
        )}

        {!isGuest && !canAccessSchema && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {/* Note for non-coders: only players marked as "ordinarie" by admin can access Schema. */}
            Du är inte markerad som ordinarie spelare ännu. Kontakta admin för åtkomst till Schema.
          </Alert>
        )}

        <Box sx={{ mb: 4, p: 2, bgcolor: "background.paper", borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Uppkommande bokningar
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
            {/* Note for non-coders: this section shows scheduled games separately from the voting list. */}
            Här visas planerade matcher som redan är bokade.
          </Typography>
          {user?.is_admin && (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<EventIcon />}
                onClick={() => openInviteDialog()}
              >
                Ny kalenderinbjudan
              </Button>
              <Tooltip title="Skapa veckans tillgänglighetsomröstning" arrow>
                <span>
                  {/* Note for non-coders: this is the same poll-creation flow as before,
                  now grouped under scheduled matches so admins find all planning actions in one place. */}
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => createPollMutation.mutate()}
                    disabled={createPollMutation.isPending || !selectedWeek}
                  >
                    Admin: skapa omröstning
                  </Button>
                </span>
              </Tooltip>
            </Stack>
          )}
          {user?.is_admin && selectedWeek && (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2, width: { xs: "100%", sm: "auto" } }}>
              <Tooltip title="Föregående vecka" arrow>
                <span>
                  <IconButton
                    size="small"
                    aria-label="Välj föregående vecka"
                    onClick={() => handleWeekStep(-1)}
                    disabled={weekOptions.findIndex((w) => w.key === selectedWeekKey) <= 0}
                  >
                    <RemoveIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>

              <Select
                size="small"
                value={selectedWeekKey}
                onChange={(e) => setSelectedWeekKey(e.target.value)}
                sx={{ minWidth: 160, height: 36, fontSize: "0.875rem" }}
              >
                {weekOptions.map((option) => (
                  <MenuItem key={option.key} value={option.key} sx={{ fontSize: "0.875rem" }}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>

              <Tooltip title="Nästa vecka" arrow>
                <span>
                  <IconButton
                    size="small"
                    aria-label="Välj nästa vecka"
                    onClick={() => handleWeekStep(1)}
                    disabled={weekOptions.findIndex((w) => w.key === selectedWeekKey) >= weekOptions.length - 1}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          )}
          {isFetchingScheduledGames && upcomingBookings.length === 0 ? (
            <Typography variant="body2">Laddar bokningar...</Typography>
          ) : upcomingBookings.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Inga bokningar planerade ännu.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {upcomingBookings.map((game) => (
                <Card key={game.id} variant="outlined">
                  <CardContent sx={{ py: 1.25, "&:last-child": { pb: 1.25 } }}>
                    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
                      <Box>
                        <Typography sx={{ fontWeight: 700 }}>
                          {game.title || "Padelpass"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {formatFullDate(game.date)} • {formatTime(game.start_time)}–{formatTime(game.end_time)}
                        </Typography>
                        {game.location && (
                          <Typography variant="body2" color="text.secondary">
                            {/* Note for non-coders: the location is free text so admins can describe any venue. */}
                            Plats: {game.location}
                          </Typography>
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}>
                        {game.invitee_profile_ids?.length ? `${game.invitee_profile_ids.length} inbjudna` : "Inbjudan skickad"}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Box>

        {isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {(error as any)?.message || "Kunde inte hämta omröstningar."}
          </Alert>
        )}

        {isLoading ? (
          <Typography>Laddar schema...</Typography>
        ) : pollsSorted.length === 0 ? (
          <EmptyState
            title="Inga omröstningar"
            description="Det finns inga aktiva eller planerade schemaomröstningar just nu."
          />
        ) : (
          <Stack spacing={1.5}>
            {pollsSorted.map((poll) => {
              const mailState = computeEmailAvailability(poll);
              const isExpanded = Boolean(expandedPolls[poll.id]);
              const readyDaysCount = (poll.days || []).filter((day) => evaluatePollDay(day).isGreen).length;
              const totalDaysCount = (poll.days || []).length;
              const progressPercent = totalDaysCount > 0 ? Math.round((readyDaysCount / totalDaysCount) * 100) : 0;

              return (
                <Accordion key={poll.id} expanded={isExpanded} onChange={(_, expanded) => togglePollExpanded(poll.id, expanded)}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Stack direction="row" justifyContent="space-between" sx={{ width: "100%" }} spacing={2} alignItems="center">
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                          Vecka {poll.week_number}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatShortDate(poll.start_date)} - {formatShortDate(poll.end_date)} ({poll.week_year})
                        </Typography>
                      </Box>

                      <Stack direction="row" spacing={1} alignItems="center">
                        <Stack spacing={0.25} sx={{ minWidth: 120 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            {readyDaysCount}/{totalDaysCount} dagar spelklara
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={progressPercent}
                            aria-label={`Spelklar progress: ${readyDaysCount} av ${totalDaysCount} dagar`}
                            sx={{ height: 6, borderRadius: 99 }}
                          />
                        </Stack>

                        {poll.status === "open" ? (
                          <Chip size="small" color="success" label="Öppen" sx={{ fontWeight: 600, height: 24 }} />
                        ) : (
                          <Chip size="small" label="Stängd" sx={{ fontWeight: 600, height: 24 }} />
                        )}
                      </Stack>
                    </Stack>
                  </AccordionSummary>

                  <AccordionDetails>
                    <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: "wrap", alignItems: "center" }}>
                      {user?.is_admin && (
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "flex-start", sm: "center" }} sx={{ width: '100%' }}>
                          <Button
                            size="small"
                            startIcon={<EmailIcon />}
                            variant="outlined"
                            sx={{ whiteSpace: "nowrap" }}
                            disabled={!mailState.canSend || sendEmailMutation.isPending}
                            onClick={() =>
                              sendEmailMutation.mutate({
                                pollId: poll.id,
                                onlyMissingVotes: Boolean(onlyMissingVotesByPoll[poll.id]),
                              })}
                          >
                            Påminn spelare
                          </Button>

                          <Tooltip title="Skicka kalenderinbjudan" arrow>
                            <span>
                              <Button
                                size="small"
                                startIcon={<EventIcon />}
                                variant="outlined"
                                sx={{ whiteSpace: "nowrap" }}
                                onClick={() => openInviteDialog(poll)}
                              >
                                Kalenderinbjudan
                              </Button>
                            </span>
                          </Tooltip>

                          <FormControlLabel
                            sx={{ ml: { xs: 0, sm: 0.5 }, whiteSpace: "nowrap" }}
                            control={(
                              <Switch
                                size="small"
                                checked={Boolean(onlyMissingVotesByPoll[poll.id])}
                                onChange={(_, checked) => {
                                  // Note for non-coders: this switch decides if reminders should skip people who already voted.
                                  setOnlyMissingVotesByPoll((prev) => ({ ...prev, [poll.id]: checked }));
                                }}
                              />
                            )}
                            label={<Typography variant="caption">Bara de som inte röstat</Typography>}
                          />

                          <Tooltip title="Fler åtgärder" arrow>
                            <IconButton
                              size="small"
                              aria-label={`Fler åtgärder för vecka ${poll.week_number}`}
                              onClick={(event) => openActionMenu(event, poll.id)}
                            >
                              <MoreVertIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      )}
                    </Stack>

                    {user?.is_admin && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
                        {/* Note for non-coders: this helper text explains when reminder mail is allowed. */}
                        {mailState.helper}
                      </Typography>
                    )}

                    <Divider sx={{ mb: 1.5 }} />

                    <Stack spacing={1.25}>
                      {(poll.days || []).map((day) => {
                        const mySlots = normalizeVoteSlots(day, user?.id);
                        const isChecked = mySlots !== null;
                        const selectedSlots = mySlots || [];
                        const status = evaluatePollDay(day);

                        const voters = (day.votes || []).map((vote) => {
                          const profile = profileDataMap.get(vote.profile_id);
                          const slots = vote.slot_preferences && vote.slot_preferences.length > 0
                            ? vote.slot_preferences.map(s => SLOT_OPTIONS.find(o => o.value === s)?.label || s).join("/")
                            : vote.slot
                              ? SLOT_OPTIONS.find(o => o.value === vote.slot)?.label || vote.slot
                              : "hela dagen";
                          return {
                            id: vote.profile_id,
                            name: profile?.name || "Okänd spelare",
                            avatar_url: profile?.avatar_url,
                            slots,
                          };
                        });

                        return (
                          <Card
                            key={day.id}
                            variant="outlined"
                            sx={{
                              borderColor: status.isGreen ? "success.main" : "divider",
                              bgcolor: status.isGreen ? "success.light" : "background.paper",
                            }}
                          >
                            <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Checkbox
                                    checked={isChecked}
                                    onChange={(e) => handleToggleDay(day, e.target.checked)}
                                    disabled={isGuest || poll.status !== "open"}
                                  />
                                  <Box>
                                    <Typography sx={{ fontWeight: 700, textTransform: 'capitalize' }}>
                                      {formatFullDate(day.date)}
                                    </Typography>
                                    <Typography variant="caption" color={status.isGreen ? "success.dark" : "text.secondary"} sx={{ fontWeight: status.isGreen ? 600 : 400 }}>
                                      {status.totalVoters} {status.totalVoters === 1 ? 'röst' : 'röster'} {status.isGreen ? "• Spelklar" : "• Ej spelklar än"}
                                    </Typography>
                                  </Box>
                                </Stack>

                                <Chip
                                  size="small"
                                  label={selectedSlots.length === 0 ? "Hela dagen" : selectedSlots.map((slot) => SLOT_OPTIONS.find((o) => o.value === slot)?.label || slot).join(" + ")}
                                />
                              </Stack>

                              {isChecked && (
                                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1 }}>
                                  {SLOT_OPTIONS.map((option) => (
                                    <FormControlLabel
                                      key={option.value}
                                      control={
                                        <Checkbox
                                          size="small"
                                          checked={selectedSlots.includes(option.value)}
                                          onChange={() => handleToggleSlot(day, option.value, selectedSlots)}
                                          disabled={isGuest || poll.status !== "open"}
                                        />
                                      }
                                      label={option.label}
                                    />
                                  ))}
                                </Stack>
                              )}

                              {voters.length > 0 && (
                                <AvatarGroup
                                  max={10}
                                  spacing="small"
                                  sx={{
                                    mt: 1.5,
                                    justifyContent: 'flex-start',
                                    '& .MuiAvatar-root': { width: 28, height: 28, fontSize: '0.75rem', border: '2px solid #fff' }
                                  }}
                                >
                                  {voters.map((v) => (
                                    <Tooltip key={v.id} title={`${v.name} (${v.slots})`} arrow>
                                      <Box component="span">
                                        <Avatar src={v.avatar_url || undefined} name={v.name} size={28} />
                                      </Box>
                                    </Tooltip>
                                  ))}
                                </AvatarGroup>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Stack>
        )}
      </PageShell>

      <Menu
        anchorEl={actionMenuAnchorEl}
        open={Boolean(actionMenuAnchorEl)}
        onClose={closeActionMenu}
      >
        {actionMenuPollId && (
          <MenuItem
            onClick={() => {
              setDangerPollId(actionMenuPollId);
              closeActionMenu();
            }}
          >
            Farliga åtgärder
          </MenuItem>
        )}
      </Menu>

      <Dialog open={Boolean(dangerPollId)} onClose={() => setDangerPollId(null)} fullWidth maxWidth="xs">
        <DialogTitle>Farliga åtgärder</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {/* Note for non-coders: dangerous actions can permanently remove data, so we show a dedicated warning step first. */}
            Här finns åtgärder som påverkar omröstningen permanent.
          </DialogContentText>
          {dangerPollId && (
            <Stack spacing={1}>
              {pollsSorted.find((entry) => entry.id === dangerPollId)?.status === "open" && (
                <Button
                  color="warning"
                  variant="contained"
                  onClick={() => {
                    closePollMutation.mutate(dangerPollId);
                    setDangerPollId(null);
                  }}
                >
                  Stäng omröstning
                </Button>
              )}
              <Button
                color="error"
                variant="contained"
                onClick={() => {
                  setConfirmDeletePollId(dangerPollId);
                  setDangerPollId(null);
                }}
              >
                Radera omröstning
              </Button>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDangerPollId(null)}>Avbryt</Button>
        </DialogActions>
      </Dialog>


      <Dialog open={inviteDialogOpen} onClose={closeInviteDialog} fullWidth maxWidth="sm">
        <DialogTitle>Skicka kalenderinbjudan</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {/* Note for non-coders: this dialog collects the event info before sending the calendar invite email. */}
            Välj datum, start- och sluttid samt vilka spelare som ska få kalenderinbjudan.
          </DialogContentText>
          <Stack spacing={2}>
            <TextField
              select
              label="Åtgärd"
              value={inviteAction}
              onChange={(event) => setInviteAction(event.target.value as "create" | "update" | "cancel")}
              helperText="Välj skapa, uppdatera eller avbryt i kalendern."
            >
              <MenuItem value="create">Skapa</MenuItem>
              <MenuItem value="update">Uppdatera</MenuItem>
              <MenuItem value="cancel">Avbryt</MenuItem>
            </TextField>
            {invitePollId ? (
              <TextField
                select
                label="Datum"
                value={inviteDate}
                onChange={(event) => setInviteDate(event.target.value)}
                helperText="Välj vilken dag inbjudan ska gälla."
              >
                {(pollsSorted.find((poll) => poll.id === invitePollId)?.days || []).map((day) => (
                  <MenuItem key={day.id} value={day.date}>
                    {formatFullDate(day.date)}
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <TextField
                type="date"
                label="Datum"
                value={inviteDate}
                onChange={(event) => setInviteDate(event.target.value)}
                InputLabelProps={{ shrink: true }}
                helperText="Välj vilken dag inbjudan ska gälla."
              />
            )}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                type="time"
                label="Starttid"
                value={inviteStartTime}
                onChange={(event) => setInviteStartTime(event.target.value)}
                InputLabelProps={{ shrink: true }}
                helperText="När matcherna börjar."
                fullWidth
              />
              <TextField
                type="time"
                label="Sluttid"
                value={inviteEndTime}
                onChange={(event) => setInviteEndTime(event.target.value)}
                InputLabelProps={{ shrink: true }}
                helperText="När matcherna slutar."
                fullWidth
              />
            </Stack>
            {/* Note for non-coders: the location field is free text so admins can type any venue details. */}
            <TextField
              label="Plats"
              value={inviteLocation}
              onChange={(event) => setInviteLocation(event.target.value)}
              helperText="Skriv in valfri platsinformation för kalenderinbjudan."
              fullWidth
            />
            <TextField
              select
              label="Bjud in spelare"
              value={inviteeProfileIds}
              onChange={(event) => {
                const next = event.target.value;
                setInviteeProfileIds(typeof next === "string" ? next.split(",") : next);
              }}
              helperText="Välj vilka spelare som ska få inbjudan."
              SelectProps={{
                multiple: true,
                renderValue: (selected) =>
                  (selected as string[])
                    .map((id) => eligibleInvitees.find((profile) => profile.id === id)?.name || "Okänd")
                    .join(", "),
              }}
            >
              {eligibleInvitees.map((profile) => (
                <MenuItem key={profile.id} value={profile.id}>
                  <Checkbox checked={inviteeProfileIds.includes(profile.id)} />
                  <ListItemText primary={profile.name || "Okänd spelare"} />
                </MenuItem>
              ))}
            </TextField>
            <Typography variant="caption" color="text.secondary">
              {/* Note for non-coders: updating/canceling uses the same event id so calendar apps recognize changes. */}
              Tips: Uppdatera eller avbryt genom att välja samma datum för eventet igen.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeInviteDialog}>Avbryt</Button>
          <Button
            variant="contained"
            onClick={handleSendInvite}
            disabled={
              sendCalendarInviteMutation.isPending ||
              !inviteDate ||
              !inviteStartTime ||
              !inviteEndTime ||
              inviteeProfileIds.length === 0
            }
          >
            Skicka
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(confirmDeletePollId)}
        onClose={() => setConfirmDeletePollId(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Bekräfta borttagning</DialogTitle>
        <DialogContent>
          {confirmDeletePollId && (() => {
            const targetPoll = pollsSorted.find((entry) => entry.id === confirmDeletePollId);
            if (!targetPoll) return null;

            return (
              <DialogContentText>
                {/* Note for non-coders: this second confirmation exists to prevent accidental permanent deletion. */}
                Du håller på att radera Vecka {targetPoll.week_number} ({targetPoll.week_year}), {formatShortDate(targetPoll.start_date)} - {formatShortDate(targetPoll.end_date)}. Alla röster försvinner permanent.
              </DialogContentText>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeletePollId(null)}>Avbryt</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              if (!confirmDeletePollId) return;
              deletePollMutation.mutate(confirmDeletePollId);
              setConfirmDeletePollId(null);
            }}
          >
            Ja, radera permanent
          </Button>
        </DialogActions>
      </Dialog>
    </PullToRefresh>
  );
}
