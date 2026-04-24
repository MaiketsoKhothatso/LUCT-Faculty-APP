const { getMyHabitsRef, connectorConfig } = require('../index.cjs.js');
const { CallerSdkTypeEnum } = require('firebase/data-connect');
const { useDataConnectQuery, validateReactArgs } = require('@tanstack-query-firebase/react/data-connect');


exports.useGetMyHabits = function useGetMyHabits(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts } = validateReactArgs(connectorConfig, dcOrOptions, options);
  const ref = getMyHabitsRef(dcInstance);
  return useDataConnectQuery(ref, inputOpts, CallerSdkTypeEnum.GeneratedReact);
}