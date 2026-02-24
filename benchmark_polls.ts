
import { availabilityService } from "./src/services/availabilityService";

async function benchmark() {
  console.time("getPolls");
  try {
    const polls = await availabilityService.getPolls();
    console.timeEnd("getPolls");
    console.log(`Fetched ${polls.length} polls`);

    const totalDays = polls.reduce((acc, p) => acc + (p.days?.length || 0), 0);
    const totalVotes = polls.reduce((acc, p) => acc + (p.days?.reduce((acc2, d) => acc2 + (d.votes?.length || 0), 0) || 0), 0);

    console.log(`Total days: ${totalDays}`);
    console.log(`Total votes: ${totalVotes}`);
  } catch (e) {
    console.error("Error fetching polls:", e);
  }
}

benchmark();
