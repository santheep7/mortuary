import { queryOne, queryAll } from '../config/db.js';

export async function getDashboardStats(req, res) {
  try {
    // All of these are independent of each other, so they run concurrently
    // instead of one at a time - was 10 sequential round-trips on every
    // dashboard load, now the wait is as long as the slowest one, not the
    // sum of all of them.
    const [
      totalBodies,
      activeAllocations,
      pendingMortuary,
      pendingService,
      releasedToday,
      readyForRelease,
      cabinStats,
      recentBodies,
      mortuaryRevenue,
      serviceRevenue,
      legacySvcRev,
      mortuaryDiscounts,
      serviceDiscounts,
    ] = await Promise.all([
      queryOne('SELECT COUNT(*) AS count FROM bodies'),
      queryOne("SELECT COUNT(*) AS count FROM cabin_allocations WHERE status='Allocated'"),
      queryOne("SELECT COUNT(*) AS count FROM billing WHERE status='Pending'"),
      queryOne("SELECT COUNT(*) AS count FROM service_billing WHERE status='Pending'"),
      queryOne("SELECT COUNT(*) AS count FROM body_releases WHERE DATE(\"releaseDateTime\") = CURRENT_DATE"),
      queryOne("SELECT COUNT(*) AS count FROM bodies WHERE status='Ready for Release'"),
      queryOne(`
        SELECT
          SUM(CASE WHEN status='Available'         THEN 1 ELSE 0 END) AS available,
          SUM(CASE WHEN status='Occupied'          THEN 1 ELSE 0 END) AS occupied,
          SUM(CASE WHEN status='Under Maintenance' THEN 1 ELSE 0 END) AS maintenance
        FROM cabins WHERE status != 'Deactivated'
      `),
      queryAll('SELECT * FROM bodies ORDER BY "createdAt" DESC LIMIT 5'),
      queryOne("SELECT SUM(\"netAmount\") AS sum FROM billing WHERE status='Settled'"),
      queryOne("SELECT SUM(\"netAmount\") AS sum FROM service_billing WHERE status='Settled'"),
      queryOne(`
        SELECT SUM("servicesAmount") AS sum
        FROM billing
        WHERE status='Settled'
          AND id NOT IN (
            SELECT DISTINCT "billingId" FROM service_billing WHERE "billingId" IS NOT NULL
          )
      `),
      queryOne('SELECT SUM("discountAmount") AS sum FROM billing'),
      queryOne('SELECT SUM("discountAmount") AS sum FROM service_billing'),
    ]);

    const pendingBillsCount = (Number(pendingMortuary?.count) || 0) + (Number(pendingService?.count) || 0);
    const totalServiceRevenue = Number(serviceRevenue?.sum || 0) + Number(legacySvcRev?.sum || 0);

    res.json({
      totalBodies:       Number(totalBodies?.count || 0),
      activeAllocations: Number(activeAllocations?.count || 0),
      pendingBills:      pendingBillsCount,
      releasedToday:     Number(releasedToday?.count || 0),
      readyForRelease:   Number(readyForRelease?.count || 0),
      cabins:            cabinStats || { available: 0, occupied: 0, maintenance: 0 },
      recentBodies,
      mortuaryRevenue:     Number(mortuaryRevenue?.sum || 0),
      serviceRevenue:      totalServiceRevenue,
      bodyDressingRevenue: totalServiceRevenue,
      mortuaryDiscount:    Number(mortuaryDiscounts?.sum || 0),
      serviceDiscount:     Number(serviceDiscounts?.sum || 0)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
}
