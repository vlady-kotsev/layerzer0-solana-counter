export * from './Count'
export * from './EndpointSettings'
export * from './LzReceiveTypesAccounts'
export * from './Remote'

import { EndpointSettings } from './EndpointSettings'
import { Count } from './Count'
import { LzReceiveTypesAccounts } from './LzReceiveTypesAccounts'
import { Remote } from './Remote'

export const accountProviders = {
  EndpointSettings,
  Count,
  LzReceiveTypesAccounts,
  Remote,
}
