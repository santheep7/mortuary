import { v4 as uuidv4 } from 'uuid';
import { queryAll, queryOne, runQuery } from '../config/db.js';

export async function getCabins(req, res) {
  try {
    const cabins = await queryAll('SELECT * FROM cabins ORDER BY "cabinNumber"');
    res.json(cabins);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function createCabin(req, res) {
  try {
    const { cabinNumber, tariff, floor, cabinType, dailyRate } = req.body;
    const id = uuidv4();
    const resolvedType      = cabinType === 'FREEZER' ? 'FREEZER' : 'NORMAL_CABIN';
    const resolvedDailyRate = parseFloat(dailyRate) || parseFloat(tariff) || 500;

    await runQuery(
      'INSERT INTO cabins (id, "cabinNumber", tariff, daily_rate, floor, cabin_type) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, cabinNumber, tariff || 500, resolvedDailyRate, floor || 1, resolvedType]
    );
    const cabin = await queryOne('SELECT * FROM cabins WHERE id = $1', [id]);
    res.json(cabin);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateCabin(req, res) {
  try {
    const { id } = req.params;
    const { cabinNumber, status, tariff, floor, cabinType, dailyRate } = req.body;
    const resolvedType      = cabinType === 'FREEZER' ? 'FREEZER' : 'NORMAL_CABIN';
    const resolvedDailyRate = parseFloat(dailyRate) || parseFloat(tariff) || 500;

    await runQuery(
      'UPDATE cabins SET "cabinNumber"=$1, status=$2, tariff=$3, daily_rate=$4, floor=$5, cabin_type=$6, "updatedAt"=NOW() WHERE id=$7',
      [cabinNumber, status, tariff, resolvedDailyRate, floor, resolvedType, id]
    );
    const cabin = await queryOne('SELECT * FROM cabins WHERE id = $1', [id]);
    res.json(cabin);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function deleteCabin(req, res) {
  try {
    const { id } = req.params;
    await runQuery("UPDATE cabins SET status = 'Deactivated' WHERE id = $1", [id]);
    res.json({ message: 'Cabin deactivated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
