export default function ToolLayout({ controls, preview, header }) {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">

      {header && (
        <div className="border-b border-gray-200 pb-4">
          {header}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 items-start lg:grid-cols-[1fr_2fr]">
        <div className="space-y-5">{controls}</div>
        <div className="lg:sticky lg:top-8">{preview}</div>
      </div>

    </div>
  )
}
