/**
 * ansoby - Public facility reservation orchestrator
 */

import { ChigasakiClient, CHIGASAKI_CONFIG } from './providers/chigasaki/index.js';
import { getToday, addDays, formatDate } from './utils/date.js';

/**
 * メイン処理
 */
async function main() {
  console.log('ansoby - Public facility reservation orchestrator');
  console.log('==================================================\n');

  console.log('Supported providers:');
  console.log(`- ${CHIGASAKI_CONFIG.name} (${CHIGASAKI_CONFIG.provider})`);
  console.log(`  Active system: ${CHIGASAKI_CONFIG.systems.new.name}`);
  console.log(`  Base URL: ${CHIGASAKI_CONFIG.systems.new.baseUrl}\n`);

  const client = new ChigasakiClient();

  try {
    console.log('Fetching facilities...');
    const facilities = await client.getFacilities();
    console.log(`Found ${facilities.length} facilities\n`);

    if (facilities.length > 0) {
      const facility = facilities[0];
      console.log(`Example facility:`);
      console.log(`  ID: ${facility.id}`);
      console.log(`  Name: ${facility.name}\n`);

      const today = getToday();
      const endDate = formatDate(addDays(new Date(), 7));
      
      console.log(`Checking availability for ${facility.name}`);
      console.log(`  Period: ${today} to ${endDate}`);
      
      const availability = await client.getAvailability({
        facilityId: facility.id,
        date: today,
        days: 7,
      });

      console.log(`  Found ${availability.length} time slots`);
      
      const available = availability.filter(a => a.status === 'available').length;
      const reserved = availability.filter(a => a.status === 'reserved').length;
      
      console.log(`    Available: ${available}`);
      console.log(`    Reserved: ${reserved}`);
    }
  } catch (error) {
    console.error('\nError:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { ChigasakiClient, CHIGASAKI_CONFIG };
