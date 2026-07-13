import { v4 as uuidv4 } from 'uuid';
import { queryAll, queryOne, runQuery } from '../config/db.js';

export async function getServices(req, res) {
  try {
    const services = await queryAll('SELECT * FROM service_master ORDER BY service_name');
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function createService(req, res) {
  try {
    const userRole = req.headers['x-user-role'];
    if (userRole !== 'Admin')
      return res.status(403).json({ error: 'Access denied. Only Admins can modify services.' });

    const { service_name, tariff } = req.body;
    if (!service_name || tariff === undefined)
      return res.status(400).json({ error: 'service_name and tariff are required' });

    const id = uuidv4();
    await runQuery(
      'INSERT INTO service_master (id, service_name, tariff) VALUES ($1, $2, $3)',
      [id, service_name.trim(), parseFloat(tariff) || 0]
    );
    const service = await queryOne('SELECT * FROM service_master WHERE id = $1', [id]);
    res.json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateService(req, res) {
  try {
    const userRole = req.headers['x-user-role'];
    if (userRole !== 'Admin')
      return res.status(403).json({ error: 'Access denied. Only Admins can modify services.' });

    const { id } = req.params;
    const { service_name, tariff } = req.body;
    if (!service_name || tariff === undefined)
      return res.status(400).json({ error: 'service_name and tariff are required' });

    await runQuery(
      'UPDATE service_master SET service_name=$1, tariff=$2, "updatedAt"=NOW() WHERE id=$3',
      [service_name.trim(), parseFloat(tariff) || 0, id]
    );
    const service = await queryOne('SELECT * FROM service_master WHERE id = $1', [id]);
    res.json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function deleteService(req, res) {
  try {
    const userRole = req.headers['x-user-role'];
    if (userRole !== 'Admin')
      return res.status(403).json({ error: 'Access denied. Only Admins can modify services.' });

    const { id } = req.params;
    await runQuery('DELETE FROM service_master WHERE id = $1', [id]);
    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
