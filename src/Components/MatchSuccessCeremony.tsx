import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Box, Typography, Stack, Paper, Chip, Avatar } from "@mui/material";
import { TrendingUp, TrendingDown, EmojiEvents, Star } from "@mui/icons-material";
import { MatchRecap } from "../types";
interface MatchSuccessCeremonyProps {
  recap: MatchRecap;
}

const AnimatedNumber = ({ value, color }: { value: number, color?: string }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const start = 0;
    const end = value;
    const duration = 1000;
    const startTime = performance.now();

    const update = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const current = Math.floor(start + (end - start) * progress);
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };

    requestAnimationFrame(update);
  }, [value]);

  return <Typography variant="h5" sx={{ fontWeight: 900, color }}>{displayValue}</Typography>;
};

export default function MatchSuccessCeremony({ recap }: MatchSuccessCeremonyProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => {
        setStep(1);
        if ("vibrate" in navigator) navigator.vibrate(20);
      }, 500),  // Show Score
      setTimeout(() => {
        setStep(2);
        if ("vibrate" in navigator) navigator.vibrate([10, 30, 10]);
      }, 1500), // Show ELO Deltas
      setTimeout(() => {
        setStep(3);
        if ("vibrate" in navigator) navigator.vibrate(40);
      }, 3000), // Show Rank Info/Final
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <Box sx={{ position: 'relative', overflow: 'hidden', minHeight: 300 }}>
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="start"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.2, opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300 }}
          >
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0]
              }}
              transition={{ duration: 0.5, repeat: 2 }}
            >
              <EmojiEvents sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
            </motion.div>
            <Typography variant="h4" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>Match Sparad!</Typography>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="score"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300 }}
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.3 }}
            >
              <Typography variant="h2" sx={{ fontWeight: 900, letterSpacing: 4 }}>{recap.scoreline}</Typography>
            </motion.div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 10, delay: 0.2 }}
            >
              <Chip
                label={recap.teamAWon ? "Lag A Vann" : "Lag B Vann"}
                color="success"
                sx={{ fontWeight: 800, mt: 2 }}
              />
            </motion.div>
          </motion.div>
        )}

        {step >= 2 && (
          <motion.div
            key="elo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ p: 2 }}
          >
            <Stack spacing={2}>
              <Box sx={{ textAlign: 'center', mb: 1 }}>
                <Typography variant="overline" sx={{ fontWeight: 800, color: 'primary.main' }}>ELO Uppdatering</Typography>
              </Box>

              <Stack direction="row" spacing={2}>
                <Paper sx={{ flex: 1, p: 2, bgcolor: recap.teamAWon ? 'rgba(76, 175, 80, 0.05)' : 'transparent', border: '1px solid', borderColor: recap.teamAWon ? 'success.light' : 'divider' }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', mb: 1 }}>Lag A</Typography>
                  {recap.teamA.players.map(p => (
                    <Stack key={p.id} direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{p.name.split(' ')[0]}</Typography>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Typography variant="caption" color={p.delta >= 0 ? "success.main" : "error.main"} sx={{ fontWeight: 900 }}>
                          {p.delta >= 0 ? "+" : ""}{p.delta}
                        </Typography>
                        <AnimatedNumber value={p.elo + p.delta} />
                      </Stack>
                    </Stack>
                  ))}
                </Paper>

                <Paper sx={{ flex: 1, p: 2, bgcolor: !recap.teamAWon ? 'rgba(76, 175, 80, 0.05)' : 'transparent', border: '1px solid', borderColor: !recap.teamAWon ? 'success.light' : 'divider' }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', mb: 1 }}>Lag B</Typography>
                  {recap.teamB.players.map(p => (
                    <Stack key={p.id} direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{p.name.split(' ')[0]}</Typography>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Typography variant="caption" color={p.delta >= 0 ? "success.main" : "error.main"} sx={{ fontWeight: 900 }}>
                          {p.delta >= 0 ? "+" : ""}{p.delta}
                        </Typography>
                        <AnimatedNumber value={p.elo + p.delta} />
                      </Stack>
                    </Stack>
                  ))}
                </Paper>
              </Stack>

              {step === 3 && (
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  style={{ textAlign: 'center', marginTop: 16 }}
                >
                  <Chip
                    icon={<Star sx={{ color: '#ffc107 !important' }} />}
                    label="Topplistan har uppdaterats!"
                    variant="outlined"
                    sx={{ fontWeight: 800, borderColor: '#ffc107', color: '#b58900' }}
                  />
                </motion.div>
              )}
            </Stack>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
}
