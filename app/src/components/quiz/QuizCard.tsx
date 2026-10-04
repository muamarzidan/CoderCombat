import { RichText } from '../ui/RichText'
import NoCopy from '../ui/NoCopy'

interface QuizCardProps {
  questionIndex: number
  totalQuestions: number
  questionText: string
  options: string[]
  selectedIndex?: number
  onSelect: (index: number) => void
  showSubmit?: boolean
  onSubmit?: () => void
}

export default function QuizCard({
  questionIndex,
  totalQuestions,
  questionText,
  options,
  selectedIndex,
  onSelect,
  showSubmit,
  onSubmit,
}: QuizCardProps) {
  return (
    <div className="mx-auto max-w-3xl rounded-lg border border-border bg-bg-surface p-5 sm:p-7">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
          Soal {questionIndex + 1} dari {totalQuestions}
        </span>
      </div>

      <NoCopy className="mb-6">
        <h2 className="text-base font-medium text-text">
          <RichText text={questionText} />
        </h2>
      </NoCopy>

      <NoCopy className="grid gap-2.5">
        {options.map((opt, idx) => {
          const selected = selectedIndex === idx
          return (
            <button
              key={idx}
              onClick={() => onSelect(idx)}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                selected
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-bg-raised text-text hover:border-primary/50'
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                  selected ? 'border-primary bg-primary text-on-primary' : 'border-border text-text-muted'
                }`}
              >
                {String.fromCharCode(65 + idx)}
              </span>
              <RichText text={opt} />
            </button>
          )
        })}
      </NoCopy>

      {showSubmit && (
        <button
          onClick={onSubmit}
          disabled={selectedIndex === undefined}
          className="mt-6 w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          Lanjut
        </button>
      )}
    </div>
  )
}
