import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions, DataConnectSettings } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;
export const dataConnectSettings: DataConnectSettings;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface DailyLog_Key {
  id: UUIDString;
  __typename?: 'DailyLog_Key';
}

export interface GetMyHabitsData {
  habits: ({
    id: UUIDString;
    name: string;
    description?: string | null;
    isPublic: boolean;
    createdAt: TimestampString;
    colorHex?: string | null;
    targetFrequency?: string | null;
  } & Habit_Key)[];
}

export interface Habit_Key {
  id: UUIDString;
  __typename?: 'Habit_Key';
}

export interface Reminder_Key {
  id: UUIDString;
  __typename?: 'Reminder_Key';
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

interface GetMyHabitsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetMyHabitsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetMyHabitsData, undefined>;
  operationName: string;
}
export const getMyHabitsRef: GetMyHabitsRef;

export function getMyHabits(options?: ExecuteQueryOptions): QueryPromise<GetMyHabitsData, undefined>;
export function getMyHabits(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetMyHabitsData, undefined>;

