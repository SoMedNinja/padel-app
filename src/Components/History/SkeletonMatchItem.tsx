import React from "react";
import { Box, Card, CardContent, Stack, Skeleton, Divider } from "@mui/material";

export default function SkeletonMatchItem() {
  return (
    <Box component="li" sx={{ listStyle: "none" }}>
      <Card
        variant="outlined"
        sx={{
          borderRadius: 4,
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)',
          bgcolor: 'background.paper',
          borderColor: 'divider',
        }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 2.25 } }}>
          <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Skeleton variant="circular" width={26} height={26} />
              <Skeleton variant="text" width={100} height={24} />
            </Stack>
          </Box>

          <Stack direction="row" spacing={{ xs: 1.25, sm: 2 }} alignItems="stretch">
             {/* Score Column */}
            <Box sx={{ width: { xs: 90, sm: 108 }, flexShrink: 0, textAlign: "center", py: { xs: 0.4, sm: 0.8 }, px: 0.5 }}>
               <Skeleton variant="text" sx={{ fontSize: { xs: 30, sm: 38 }, width: '60%', mx: 'auto' }} />
               <Skeleton variant="text" sx={{ mt: 0.45, fontSize: { xs: 11, sm: 12 }, width: '40%', mx: 'auto' }} />
            </Box>

             <Divider orientation="vertical" flexItem sx={{ borderColor: "divider", opacity: 0.8 }} />

             {/* Teams Column */}
            <Stack sx={{ flex: 1 }} spacing={1.25}>
               {/* Team A */}
               <Stack spacing={0.5}>
                 <Box sx={{ display: "flex", alignItems: "center", gap: 1, minHeight: 32 }}>
                    <Skeleton variant="circular" width={24} height={24} />
                    <Skeleton variant="text" width="60%" height={20} />
                    <Skeleton variant="text" width={30} height={20} sx={{ ml: 'auto' }} />
                 </Box>
                 <Box sx={{ display: "flex", alignItems: "center", gap: 1, minHeight: 32 }}>
                    <Skeleton variant="circular" width={24} height={24} />
                    <Skeleton variant="text" width="60%" height={20} />
                    <Skeleton variant="text" width={30} height={20} sx={{ ml: 'auto' }} />
                 </Box>
               </Stack>

               <Divider sx={{ borderColor: "divider", opacity: 0.8 }} />

               {/* Team B */}
               <Stack spacing={0.5}>
                 <Box sx={{ display: "flex", alignItems: "center", gap: 1, minHeight: 32 }}>
                    <Skeleton variant="circular" width={24} height={24} />
                    <Skeleton variant="text" width="60%" height={20} />
                    <Skeleton variant="text" width={30} height={20} sx={{ ml: 'auto' }} />
                 </Box>
                 <Box sx={{ display: "flex", alignItems: "center", gap: 1, minHeight: 32 }}>
                    <Skeleton variant="circular" width={24} height={24} />
                    <Skeleton variant="text" width="60%" height={20} />
                    <Skeleton variant="text" width={30} height={20} sx={{ ml: 'auto' }} />
                 </Box>
               </Stack>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
