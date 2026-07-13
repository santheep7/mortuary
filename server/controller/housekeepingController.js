import { queryAll, queryOne, runQuery } from '../config/db.js';

export async function getTasks(req, res) {
  try {
    const tasks = await queryAll(`
      SELECT ht.*, c."cabinNumber"
      FROM housekeeping_tasks ht
      JOIN cabins c ON ht."cabinId" = c.id
      ORDER BY ht."createdAt" DESC
    `);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function assignTask(req, res) {
  try {
    const { taskId, staffName } = req.body;
    if (!taskId || !staffName)
      return res.status(400).json({ error: 'taskId and staffName are required' });

    await runQuery(
      "UPDATE housekeeping_tasks SET \"assignedTo\"=$1, status='IN_PROGRESS' WHERE id=$2",
      [staffName, taskId]
    );
    res.json({ message: 'Task assigned successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function completeTask(req, res) {
  try {
    const { taskId } = req.body;
    if (!taskId) return res.status(400).json({ error: 'taskId is required' });

    await runQuery("UPDATE housekeeping_tasks SET status='COMPLETED' WHERE id=$1", [taskId]);
    res.json({ message: 'Task marked as completed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function verifyTask(req, res) {
  try {
    const { taskId } = req.body;
    if (!taskId) return res.status(400).json({ error: 'taskId is required' });

    const task = await queryOne('SELECT "cabinId" FROM housekeeping_tasks WHERE id=$1', [taskId]);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    await runQuery("UPDATE housekeeping_tasks SET status='VERIFIED' WHERE id=$1", [taskId]);
    await runQuery("UPDATE cabins SET status='Available' WHERE id=$1", [task.cabinId]);

    res.json({ message: 'Task verified and cabin is now Available' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
