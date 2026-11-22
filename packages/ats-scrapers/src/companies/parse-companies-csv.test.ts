import { describe, expect, it } from 'vitest'

import { parseCompaniesCsv } from './parse-companies-csv'

const HEADER = '\uFEFFTên công ty,Link Career,LinkedIn,Country,Đã view'

describe('parseCompaniesCsv', () => {
  it('maps the sheet columns to company rows', () => {
    const csv = [
      HEADER,
      '10up Inc.,https://10up.com/careers,10up Inc.,United States,',
      '"Acme, Ltd",https://jobs.lever.co/acme,https://www.linkedin.com/company/acme,,',
    ].join('\n')

    expect(parseCompaniesCsv(csv)).toEqual([
      {
        name: '10up Inc.',
        slug: '10up-inc',
        careerUrl: 'https://10up.com/careers',
        linkedInUrl: null,
        country: 'United States',
      },
      {
        name: 'Acme, Ltd',
        slug: 'acme-ltd',
        careerUrl: 'https://jobs.lever.co/acme',
        linkedInUrl: 'https://www.linkedin.com/company/acme',
        country: null,
      },
    ])
  })

  it('skips rows without a name or a career link', () => {
    const csv = [HEADER, ',https://x.dev/careers,,,', 'No Link,,,,', 'Bad Link,n/a,,,'].join('\n')
    expect(parseCompaniesCsv(csv)).toEqual([])
  })

  it('de-duplicates slugs', () => {
    const csv = [HEADER, 'A.Team,https://a.dev,,,', 'A Team,https://b.dev,,,'].join('\n')
    expect(parseCompaniesCsv(csv).map((row) => row.slug)).toEqual(['a-team', 'a-team-2'])
  })
})
