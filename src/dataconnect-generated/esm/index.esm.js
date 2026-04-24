import { queryRef, executeQuery, validateArgsWithOptions, validateArgs, makeMemoryCacheProvider } from 'firebase/data-connect';

export const connectorConfig = {
  connector: 'example',
  service: 'luct-faculty-app',
  location: 'us-east4'
};
export const dataConnectSettings = {
  cacheSettings: {
    cacheProvider: makeMemoryCacheProvider()
  }
};
export const getMyHabitsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMyHabits');
}
getMyHabitsRef.operationName = 'GetMyHabits';

export function getMyHabits(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(getMyHabitsRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}

