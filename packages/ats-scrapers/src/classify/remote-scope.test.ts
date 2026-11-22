import { describe, expect, it } from 'vitest'

import { classifyRemoteScope } from './remote-scope'

describe('classifyRemoteScope', () => {
  it.each(['Worldwide', 'Remote (Anywhere)', 'Global', 'Remote - Remote', 'remote - worldwide'])(
    'classifies %s as WORLDWIDE',
    (location) => {
      expect(classifyRemoteScope(location)).toBe('WORLDWIDE')
    },
  )

  it.each([
    'Remote - APAC',
    'Ho Chi Minh City, Vietnam',
    'Singapore',
    'Remote (GMT+7 ± 3h)',
    'Southeast Asia',
  ])('classifies %s as APAC_FRIENDLY', (location) => {
    expect(classifyRemoteScope(location)).toBe('APAC_FRIENDLY')
  })

  it.each(['Remote - US Only', 'Remote - United States', 'North America', 'Remote, EU only'])(
    'classifies %s as RESTRICTED_US_EU',
    (location) => {
      expect(classifyRemoteScope(location)).toBe('RESTRICTED_US_EU')
    },
  )

  it.each(['Remote', 'London, UK', 'Australasia', 'Globalization Office', '', null, undefined])(
    'classifies %s as UNKNOWN',
    (location) => {
      expect(classifyRemoteScope(location)).toBe('UNKNOWN')
    },
  )

  it('prefers the least restrictive scope when several match', () => {
    expect(classifyRemoteScope('Remote - Worldwide (United States preferred)')).toBe('WORLDWIDE')
    expect(classifyRemoteScope('Remote - Singapore / United States')).toBe('APAC_FRIENDLY')
  })
})
