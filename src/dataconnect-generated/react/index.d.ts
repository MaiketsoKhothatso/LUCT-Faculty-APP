import { GetMyHabitsData } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useGetMyHabits(options?: useDataConnectQueryOptions<GetMyHabitsData>): UseDataConnectQueryResult<GetMyHabitsData, undefined>;
export function useGetMyHabits(dc: DataConnect, options?: useDataConnectQueryOptions<GetMyHabitsData>): UseDataConnectQueryResult<GetMyHabitsData, undefined>;
