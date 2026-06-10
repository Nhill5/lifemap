import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { timeToMinutes, minutesToTime } from '@/hooks/useClock'
import type { Block, BlockStatus, AccentSlot } from '@/types'

export interface RichBlock extends Omit<Block, 'sub_goal_id' | 'task_id'> {
  task_id: string | null
  sub_goal_id: string | null
  bucket_id: string | null
  bucket_color: AccentSlot | null
  bucket_name: string | null
  rollover_count: number
  is_major: boolean
}

interface AddBlockParams {
  title: string
  bucketId: string | null
  startTime: string | null   // null = untimed (a to-do for the day)
  endTime: string | null
  isMajor?: boolean
}

export interface EditBlockParams {
  title: string
  bucketId: string | null
  startTime: string | null
  endTime: string | null
  isMajor: boolean
}

type BucketRef = { id: string; name: string; color: string } | null
type TaskRow = {
  id: string
  bucket_id: string | null
  rollover_count: number
  is_major: boolean
  buckets: BucketRef
}
type SubGoalRef = { bucket_id: string | null; buckets: BucketRef } | null

function toRich(b: Block & { tasks: TaskRow | null; sub_goals: SubGoalRef }): RichBlock {
  const { tasks, sub_goals, ...blockFields } = b
  // Bucket comes from the task (for task/external blocks) OR the sub-goal
  // (for recurring blocks) — so every block carries its bucket color.
  const bucket = tasks?.buckets ?? sub_goals?.buckets ?? null
  return {
    ...blockFields,
    bucket_id: tasks?.bucket_id ?? sub_goals?.bucket_id ?? null,
    bucket_color: (bucket?.color ?? null) as AccentSlot | null,
    bucket_name: bucket?.name ?? null,
    rollover_count: tasks?.rollover_count ?? 0,
    is_major: tasks?.is_major ?? false,
  }
}

export function useBlocks(date: string) {
  const { user } = useAuth()
  const [blocks, setBlocks] = useState<RichBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    if (!user) { setLoading(false); return }
    setLoading(true)
    supabase
      .from('blocks')
      .select('*, tasks(id, bucket_id, rollover_count, is_major, buckets(id, name, color)), sub_goals(bucket_id, buckets(id, name, color))')
      .eq('user_id', user.id)
      .eq('date', date)
      .in('status', ['planned', 'done', 'missed', 'moved'])
      .order('start_time')
      .then(({ data }) => {
        setBlocks(((data ?? []) as unknown as (Block & { tasks: TaskRow | null; sub_goals: SubGoalRef })[]).map(toRich))
        setLoading(false)
      })
  }, [user, date, tick])

  async function setStatus(id: string, status: BlockStatus) {
    await supabase.from('blocks').update({ status }).eq('id', id)
    refetch()
  }

  /** Evening-mirror "assume adherence": flush remaining planned blocks to done. */
  async function confirmPlannedAsDone() {
    if (!user) return
    await supabase.from('blocks').update({ status: 'done' })
      .eq('user_id', user.id).eq('date', date).eq('status', 'planned')
    refetch()
  }

  async function addBlock({ title, bucketId, startTime, endTime, isMajor = false }: AddBlockParams) {
    if (!user) return
    let taskId: string | null = null
    // A task is needed if there's a bucket OR the block is flagged major
    // (is_major lives on the task, so major external blocks still get one).
    if (bucketId || isMajor) {
      const { data: task } = await supabase
        .from('tasks')
        .insert({ user_id: user.id, bucket_id: bucketId, title, status: 'todo', rollover_count: 0, is_major: isMajor })
        .select('id')
        .single()
      taskId = task?.id ?? null
    }
    await supabase.from('blocks').insert({
      user_id: user.id,
      title,
      date,
      start_time: startTime,
      end_time: endTime,
      source: bucketId ? ('task' as const) : ('external' as const),
      task_id: taskId,
      status: 'planned',
    })
    refetch()
  }

  async function editBlock(block: RichBlock, { title, bucketId, startTime, endTime, isMajor }: EditBlockParams) {
    if (!user) return
    let taskId = block.task_id

    if (block.task_id) {
      // Existing task: update title, bucket, and major flag in place
      await supabase
        .from('tasks')
        .update({ title, bucket_id: bucketId, is_major: isMajor })
        .eq('id', block.task_id)
    } else if (bucketId || isMajor) {
      // No task yet, but now one is needed (bucket assigned or marked major)
      const { data: task } = await supabase
        .from('tasks')
        .insert({ user_id: user.id, bucket_id: bucketId, title, status: 'todo', rollover_count: 0, is_major: isMajor })
        .select('id')
        .single()
      taskId = task?.id ?? null
    }

    await supabase.from('blocks').update({
      title,
      start_time: startTime,
      end_time: endTime,
      task_id: taskId,
      source: bucketId ? ('task' as const) : ('external' as const),
    }).eq('id', block.id)
    refetch()
  }

  async function carryBlock(block: RichBlock, toDate: string) {
    await supabase.from('blocks').update({ date: toDate }).eq('id', block.id)
    if (block.task_id) {
      await supabase
        .from('tasks')
        .update({ rollover_count: block.rollover_count + 1 })
        .eq('id', block.task_id)
    }
    refetch()
  }

  async function dropBlock(block: RichBlock) {
    await supabase.from('blocks').update({ status: 'dropped' }).eq('id', block.id)
    if (block.task_id) {
      await supabase.from('tasks').update({ status: 'dropped' }).eq('id', block.task_id)
    }
    refetch()
  }

  /** Drag-to-reschedule: move a block to a new start (minutes since midnight),
   *  preserving its duration. An untimed block becomes a 60-min timed block. */
  async function moveBlock(block: RichBlock, startMinutes: number) {
    const dur = block.start_time && block.end_time
      ? Math.max(15, timeToMinutes(block.end_time) - timeToMinutes(block.start_time))
      : 60
    const start = minutesToTime(startMinutes)
    const end = minutesToTime(startMinutes + dur)
    if (start === block.start_time && end === block.end_time) return
    await supabase.from('blocks').update({ start_time: start, end_time: end }).eq('id', block.id)
    refetch()
  }

  return { blocks, loading, setStatus, confirmPlannedAsDone, addBlock, editBlock, carryBlock, dropBlock, moveBlock, refetch }
}
