# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `React README`, you can find it at [`dataconnect-generated/react/README.md`](./react/README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*GetMyHabits*](#getmyhabits)
- [**Mutations**](#mutations)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## GetMyHabits
You can execute the `GetMyHabits` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getMyHabits(options?: ExecuteQueryOptions): QueryPromise<GetMyHabitsData, undefined>;

interface GetMyHabitsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetMyHabitsData, undefined>;
}
export const getMyHabitsRef: GetMyHabitsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getMyHabits(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetMyHabitsData, undefined>;

interface GetMyHabitsRef {
  ...
  (dc: DataConnect): QueryRef<GetMyHabitsData, undefined>;
}
export const getMyHabitsRef: GetMyHabitsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getMyHabitsRef:
```typescript
const name = getMyHabitsRef.operationName;
console.log(name);
```

### Variables
The `GetMyHabits` query has no variables.
### Return Type
Recall that executing the `GetMyHabits` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetMyHabitsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `GetMyHabits`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getMyHabits } from '@dataconnect/generated';


// Call the `getMyHabits()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getMyHabits();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getMyHabits(dataConnect);

console.log(data.habits);

// Or, you can use the `Promise` API.
getMyHabits().then((response) => {
  const data = response.data;
  console.log(data.habits);
});
```

### Using `GetMyHabits`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getMyHabitsRef } from '@dataconnect/generated';


// Call the `getMyHabitsRef()` function to get a reference to the query.
const ref = getMyHabitsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getMyHabitsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.habits);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.habits);
});
```

# Mutations

No mutations were generated for the `example` connector.

If you want to learn more about how to use mutations in Data Connect, you can follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

