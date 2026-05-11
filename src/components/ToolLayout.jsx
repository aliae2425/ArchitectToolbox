/**
 * Standard layout for tools that include a preview panel.
 * Controls: 1/3 left — Preview: 2/3 right (stacked on mobile).
 */
export default function ToolLayout({ controls, preview }) {
  return (
    <div className="mx-auto max-w-[1400px] grid grid-cols-1 gap-6 items-start lg:grid-cols-[1fr_2fr]">
      <div className="space-y-5">{controls}</div>
      <div className="lg:sticky lg:top-8">{preview}</div>
    </div>
  )
}
