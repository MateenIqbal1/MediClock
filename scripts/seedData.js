import { initDB, insertMedication, logMedicationStatus } from '../database/db';

export async function seedDummyData() {
  try {
    await initDB();

    // Start date for all meds: 7 days ago at 8 AM
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    startDate.setHours(8, 0, 0, 0);

    // Create some dummy medications that started 7 days ago
    const med1Id = await insertMedication({
      name: 'Paracetamol',
      dosage: '500mg',
      frequency: 'Once daily',
      duration: '30',
      startDate: startDate.toISOString(),
      time: startDate.toISOString(),
      reminders: 1,
      refill: 0,
      notes: 'For headache',
    });

    const time2 = new Date(startDate);
    time2.setHours(14, 0, 0, 0);
    const med2Id = await insertMedication({
      name: 'Ibuprofen',
      dosage: '200mg',
      frequency: 'Once daily',
      duration: '30',
      startDate: startDate.toISOString(),
      time: time2.toISOString(),
      reminders: 1,
      refill: 0,
      notes: 'For pain',
    });

    const time3 = new Date(startDate);
    time3.setHours(20, 0, 0, 0);
    const med3Id = await insertMedication({
      name: 'Vitamin C',
      dosage: '1000mg',
      frequency: 'Once daily',
      duration: '30',
      startDate: startDate.toISOString(),
      time: time3.toISOString(),
      reminders: 1,
      refill: 0,
      notes: 'Daily supplement',
    });

    console.log('Created meds:', med1Id, med2Id, med3Id);

    // Seed logs for past 7 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      console.log(`Seeding day ${i}: ${date.toISOString().split('T')[0]}`);

      // Paracetamol: alternate taken/missed
      if (i % 2 === 0) {
        await logMedicationStatus(med1Id, 'taken', date);
        console.log(`  Med ${med1Id}: taken`);
      } else {
        await logMedicationStatus(med1Id, 'missed', date);
        console.log(`  Med ${med1Id}: missed`);
      }

      // Ibuprofen: mostly taken, one missed
      if (i === 3) {
        await logMedicationStatus(med2Id, 'missed', date);
        console.log(`  Med ${med2Id}: missed`);
      } else {
        await logMedicationStatus(med2Id, 'taken', date);
        console.log(`  Med ${med2Id}: taken`);
      }

      // Vitamin C: all taken
      await logMedicationStatus(med3Id, 'taken', date);
      console.log(`  Med ${med3Id}: taken`);
    }

    console.log('Dummy data seeded successfully for 7 days');
    return { med1Id, med2Id, med3Id };
  } catch (err) {
    console.error('Seed error', err);
    throw err;
  }
}
