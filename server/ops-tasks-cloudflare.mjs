/**
 * Managed AI Operations — Task management with human approval workflow.
 * All data stored in Supabase for durability and auditability.
 *
 * Tables required in Supabase:
 *   - ops_tasks (id, title, description, status, priority, assignee_id, created_by, created_at, updated_at, due_date, approved_by, approved_at, rejection_reason)
 *   - ops_audit_log (id, actor_id, action, entity_type, entity_id, old_values, new_values, created_at, ip_address, user_agent)
 */

import { supabaseAdmin } from "./supabase-client.mjs";

// ── Task Statuses ──────────────────────────────────────────────────────────────

export const TASK_STATUSES = [
  "pending",
  "in_progress",
  "pending_approval",
  "approved",
  "rejected",
  "completed",
  "cancelled",
];

export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"];

// ── Create Task ────────────────────────────────────────────────────────────────

export async function createTask(task) {
  const {
    title,
    description,
    priority = "medium",
    assigneeId,
    createdBy,
    dueDate,
  } = task;

  if (!title || !createdBy) {
    throw new Error("title and createdBy are required");
  }

  const { data, error } = await supabaseAdmin
    .from("ops_tasks")
    .insert([{
      title,
      description: description || null,
      priority,
      status: "pending",
      assignee_id: assigneeId || null,
      created_by: createdBy,
      due_date: dueDate || null,
    }])
    .select()
    .single();

  if (error) throw error;

  // Audit log
  await logAudit(createdBy, "task_created", "ops_task", data.id, null, {
    title,
    priority,
    assignee_id: assigneeId,
  });

  return data;
}

// ── List Tasks ─────────────────────────────────────────────────────────────────

export async function listTasks(filters = {}) {
  let query = supabaseAdmin
    .from("ops_tasks")
    .select("*, created_by_user:profiles(full_name, email), assignee_user:profiles(full_name, email)")
    .order("created_at", { ascending: false });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.priority) {
    query = query.eq("priority", filters.priority);
  }
  if (filters.assigneeId) {
    query = query.eq("assignee_id", filters.assigneeId);
  }
  if (filters.createdBy) {
    query = query.eq("created_by", filters.createdBy);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// ── Get Task by ID ─────────────────────────────────────────────────────────────

export async function getTask(taskId) {
  const { data, error } = await supabaseAdmin
    .from("ops_tasks")
    .select("*, created_by_user:profiles(full_name, email), assignee_user:profiles(full_name, email)")
    .eq("id", taskId)
    .single();
  if (error) throw error;
  return data;
}

// ── Update Task ────────────────────────────────────────────────────────────────

export async function updateTask(taskId, updates, actorId) {
  const { data: existing } = await getTask(taskId);
  if (!existing) throw new Error("Task not found");

  const oldValues = { ...existing };

  const { data, error } = await supabaseAdmin
    .from("ops_tasks")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .select()
    .single();

  if (error) throw error;

  // Audit log
  const newValues = { ...data };
  await logAudit(actorId, "task_updated", "ops_task", taskId, oldValues, newValues);

  return data;
}

// ── Task Approval Workflow ─────────────────────────────────────────────────────

export async function approveTask(taskId, actorId, rejectionReason = null) {
  const { data: existing } = await getTask(taskId);
  if (!existing) throw new Error("Task not found");

  if (existing.status !== "pending_approval") {
    throw new Error("Task is not in pending_approval status");
  }

  const { data, error } = await supabaseAdmin
    .from("ops_tasks")
    .update({
      status: rejectionReason ? "rejected" : "approved",
      approved_by: actorId,
      approved_at: new Date().toISOString(),
      rejection_reason: rejectionReason || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .select()
    .single();

  if (error) throw error;

  await logAudit(actorId, rejectionReason ? "task_rejected" : "task_approved", "ops_task", taskId, existing, data);

  return data;
}

export async function requestTaskApproval(taskId, actorId) {
  const { data: existing } = await getTask(taskId);
  if (!existing) throw new Error("Task not found");

  if (existing.status !== "in_progress") {
    throw new Error("Only in_progress tasks can be submitted for approval");
  }

  const { data, error } = await supabaseAdmin
    .from("ops_tasks")
    .update({
      status: "pending_approval",
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .select()
    .single();

  if (error) throw error;

  await logAudit(actorId, "task_approval_requested", "ops_task", taskId, existing, data);

  return data;
}

// ── Delete Task ────────────────────────────────────────────────────────────────

export async function deleteTask(taskId, actorId) {
  const { data: existing } = await getTask(taskId);
  if (!existing) throw new Error("Task not found");

  const { error } = await supabaseAdmin
    .from("ops_tasks")
    .delete()
    .eq("id", taskId);

  if (error) throw error;

  await logAudit(actorId, "task_deleted", "ops_task", taskId, existing, null);

  return { id: taskId };
}

// ── Task Statistics ────────────────────────────────────────────────────────────

export async function getTaskStats() {
  const { data, error } = await supabaseAdmin
    .from("ops_tasks")
    .select("status");
  if (error) throw error;

  const stats = {};
  for (const status of TASK_STATUSES) {
    stats[status] = data?.filter((t) => t.status === status).length || 0;
  }
  stats.total = data?.length || 0;
  return stats;
}

// ── Audit Logging ──────────────────────────────────────────────────────────────

export async function logAudit(actorId, action, entityType, entityId, oldValues, newValues, ipAddress = null, userAgent = null) {
  try {
    await supabaseAdmin.from("ops_audit_log").insert([{
      actor_id: actorId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_values: oldValues,
      new_values: newValues,
      ip_address: ipAddress,
      user_agent: userAgent,
    }]);
  } catch (err) {
    console.error("[audit] failed to write audit log:", err.message);
  }
}

export async function getAuditLog(filters = {}) {
  let query = supabaseAdmin
    .from("ops_audit_log")
    .select("*, actor:profiles(full_name, email)")
    .order("created_at", { ascending: false });

  if (filters.entityType) {
    query = query.eq("entity_type", filters.entityType);
  }
  if (filters.entityId) {
    query = query.eq("entity_id", filters.entityId);
  }
  if (filters.actorId) {
    query = query.eq("actor_id", filters.actorId);
  }
  if (filters.action) {
    query = query.eq("action", filters.action);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
