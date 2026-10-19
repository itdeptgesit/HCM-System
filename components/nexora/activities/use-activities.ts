
"use client"

import { useState } from "react"

import {
  activities as initialActivities,
  type Activity,
  type ActivityStatus,
} from "./activity-data"

export function useActivities() {
  const [activities, setActivities] = useState<Activity[]>(initialActivities)

  const createActivity = (activity: Omit<Activity, "id">) => {
    const newActivity: Activity = {
      ...activity,
      id: crypto.randomUUID(),
    }

    setActivities((prev) => [newActivity, ...prev])

    return newActivity
  }

  const completeActivity = (activity: Activity) => {
    setActivities((prev) =>
      prev.map((item) =>
        item.id === activity.id
          ? { ...item, status: "Completed" as ActivityStatus }
          : item
      )
    )
  }

  const deleteActivity = (activity: Activity) => {
    setActivities((prev) =>
      prev.filter((item) => item.id !== activity.id)
    )
  }

  const updateActivity = (updatedActivity: Activity) => {
    setActivities((prev) =>
      prev.map((item) =>
        item.id === updatedActivity.id ? updatedActivity : item
      )
    )
  }

  return {
    activities,
    createActivity,
    completeActivity,
    deleteActivity,
    updateActivity,
  }
}