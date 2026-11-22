import { describe, expect, it } from 'vitest'

import { extractTechTags, resolveTechTag } from './tech-tags'

describe('extractTechTags', () => {
  it('matches keywords in the title and the description', () => {
    expect(
      extractTechTags(
        'Senior TypeScript Engineer',
        'You will build with React, Next.js and Node.js on AWS, backed by PostgreSQL and Docker.',
      ),
    ).toEqual(['TypeScript', 'React', 'Next.js', 'Node.js', 'Postgres', 'Docker', 'AWS'])
  })

  it('matches spelling variants', () => {
    expect(extractTechTags('Backend', 'NodeJS, Nestjs, ReactJS, nextjs, Golang, LLMs')).toEqual([
      'React',
      'Next.js',
      'Node.js',
      'NestJS',
      'Go',
      'LLM',
    ])
  })

  it('matches Go only in a language-list context', () => {
    expect(extractTechTags('Backend Engineer', 'Experience with Python, Go, or Rust')).toContain(
      'Go',
    )
    expect(extractTechTags('Backend Engineer (Go/Rust)', '')).toContain('Go')
    expect(extractTechTags('Engineer', 'services written in Go and Python')).toContain('Go')
    expect(
      extractTechTags('Account Executive', 'Go above and beyond. Own our go-to-market.'),
    ).toEqual([])
    expect(extractTechTags('Marketer', 'Go, team! We go the extra mile')).not.toContain('Go')
  })

  it('does not match common words that merely contain a keyword', () => {
    expect(
      extractTechTags(
        'Customer Support',
        'You react quickly, build trust, maintain our email campaigns and paid ads.',
      ),
    ).toEqual([])
  })

  it('matches blockchain and AI keywords', () => {
    expect(
      extractTechTags('Smart Contract Engineer', 'Solidity and web3 tooling; AI agents'),
    ).toEqual(['Solidity', 'Web3', 'AI'])
  })

  it('handles a missing description', () => {
    expect(extractTechTags('Rust Engineer', null)).toEqual(['Rust'])
  })
})

describe('resolveTechTag', () => {
  it.each([
    ['PostgreSQL', 'Postgres'],
    ['GOLANG', 'Go'],
    ['golang', 'Go'],
    ['react.js', 'React'],
    ['node js', 'Node.js'],
    [' nextjs ', 'Next.js'],
    ['llms', 'LLM'],
  ])('resolves %j to %s', (term, tag) => {
    expect(resolveTechTag(term)).toBe(tag)
  })

  it('returns null when the term is more than a tag', () => {
    expect(resolveTechTag('Senior Python Engineer')).toBeNull()
    expect(resolveTechTag('designer')).toBeNull()
  })
})
