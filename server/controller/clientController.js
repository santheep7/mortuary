import { v4 as uuidv4 } from 'uuid';
import { pool, queryOne, queryAll, runQuery } from '../config/db.js';

// ── Create Client ─────────────────────────────────────────────────────────────

export async function createClient(req, res) {
  try {
    const { client_id, mortuary_name, mortuary_logo } = req.body;

    if (!client_id || !mortuary_name) {
      return res.status(400).json({ error: 'Client ID and Mortuary Name are required' });
    }

    // Check if client_id already exists
    const existing = await queryOne('SELECT id FROM clients WHERE client_id = $1', [client_id]);
    if (existing) {
      return res.status(400).json({ error: 'Client ID already exists' });
    }

    const id = uuidv4();
    await runQuery(
      'INSERT INTO clients (id, client_id, mortuary_name, mortuary_logo) VALUES ($1, $2, $3, $4)',
      [id, client_id, mortuary_name, mortuary_logo || null]
    );

    res.status(201).json({
      message: 'Client created successfully',
      client: { id, client_id, mortuary_name, mortuary_logo }
    });
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
}

// ── List Clients ───────────────────────────────────────────────────────────────

export async function listClients(req, res) {
  try {
    const clients = await queryAll(
      'SELECT id, client_id, mortuary_name, mortuary_logo, status, created_at FROM clients ORDER BY created_at DESC'
    );
    res.json(clients);
  } catch (error) {
    console.error('List clients error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

// ── Get Client by ID ───────────────────────────────────────────────────────────

export async function getClientById(req, res) {
  try {
    const { clientId } = req.params;
    const client = await queryOne(
      'SELECT id, client_id, mortuary_name, mortuary_logo, status FROM clients WHERE client_id = $1',
      [clientId]
    );
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json(client);
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

// ── Get Client by Employee ID ───────────────────────────────────────────────────

export async function getClientByEmployeeId(req, res) {
  try {
    const { employeeId } = req.params;
    const user = await queryOne(
      'SELECT client_id FROM users WHERE employee_id = $1',
      [employeeId]
    );
    if (!user || !user.client_id) {
      return res.status(404).json({ error: 'User or client not found' });
    }
    const client = await queryOne(
      'SELECT id, client_id, mortuary_name, mortuary_logo, status FROM clients WHERE client_id = $1',
      [user.client_id]
    );
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json(client);
  } catch (error) {
    console.error('Get client by employee ID error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

// ── Update Client ─────────────────────────────────────────────────────────────

export async function updateClient(req, res) {
  try {
    const { id } = req.params;
    const { mortuary_name, mortuary_logo, status } = req.body;

    const existing = await queryOne('SELECT id FROM clients WHERE id = $1', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Client not found' });
    }

    await runQuery(
      'UPDATE clients SET mortuary_name = $1, mortuary_logo = $2, status = $3, updated_at = NOW() WHERE id = $4',
      [mortuary_name, mortuary_logo, status, id]
    );

    res.json({ message: 'Client updated successfully' });
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

// ── Delete Client ─────────────────────────────────────────────────────────────

export async function deleteClient(req, res) {
  try {
    const { id } = req.params;
    const existing = await queryOne('SELECT id FROM clients WHERE id = $1', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Client not found' });
    }

    await runQuery('DELETE FROM clients WHERE id = $1', [id]);
    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}
