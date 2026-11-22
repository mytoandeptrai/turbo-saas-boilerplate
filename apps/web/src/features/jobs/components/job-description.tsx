import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/** Server-rendered Markdown job description; raw HTML in the source is not rendered. */
export function JobDescription({ markdown }: { markdown: string | null }) {
  if (!markdown) {
    return (
      <p className="text-sm text-muted-foreground">
        No description was published for this job. See the official posting for details.
      </p>
    )
  }
  return (
    <div className="job-prose">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node: _node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer nofollow" />
          ),
          img: () => null,
        }}
      >
        {markdown}
      </Markdown>
    </div>
  )
}
