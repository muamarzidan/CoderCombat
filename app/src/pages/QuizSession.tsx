import { CheckCircle2, XCircle, ArrowLeft, RotateCcw, Trophy, Swords, LoaderPinwheel, BookOpen, ArrowRight, Timer, PlayingCards } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { contentApi } from '../lib/content'
import { messageOf } from '../lib/http'
import QuizCard from '../components/quiz/QuizCard'
import { RichText } from '../components/ui/RichText'
import type { ModuleData, GradeResponse } from '../../../shared/types'

type Phase = 'loading' | 'onboarding' | 'playing' | 'submitting' | 'review' | 'error'

function getMessage(percentage: number) {
  if (percentage === 100) return { title: 'Sempurna!', subtitle: 'Kamu menguasai seluruh materi modul ini.' }
  if (percentage >= 80) return { title: 'Hebat!', subtitle: 'Hampir sempurna. Sedikit polesan lagi.' }
  if (percentage >= 60) return { title: 'Bagus!', subtitle: 'Pemahamanmu cukup baik. Ulangi yang kurang.' }
  if (percentage >= 40) return { title: 'Coba Lagi', subtitle: 'Beberapa konsep perlu dipelajari lebih lanjut.' }
  return { title: 'Ayo Ulangi', subtitle: 'Baca ulang materi modul, lalu coba kuis lagi.' }
}

export default function QuizSession() {
  const { modulId } = useParams<{ modulId: string }>()
  const [phase, setPhase] = useState<Phase>('loading')
  const [mod, setMod] = useState<ModuleData | null>(null)
  const [answers, setAnswers] = useState<number[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [grade, setGrade] = useState<GradeResponse | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!modulId) {
      setErrorMsg('Modul tidak ditemukan.')
      setPhase('error')
      return
    }
    setPhase('loading')
    contentApi
      .getModule(modulId)
      .then((m) => {
        if (!m) {
          setErrorMsg('Modul tidak ditemukan.')
          setPhase('error')
          return
        }
        setMod(m)
        setAnswers(new Array(m.questions.length).fill(-1))
        setCurrentIdx(0)
        setPhase('onboarding')
      })
      .catch((err) => {
        setErrorMsg(messageOf(err))
        setPhase('error')
      })
  }, [modulId])

  const answeredCount = useMemo(() => answers.filter(a => a >= 0).length, [answers])
  const allAnswered = answeredCount === (mod?.questions.length ?? 0)
  const currentQ = mod?.questions[currentIdx]
  const selected = currentQ ? answers[currentIdx] : undefined

  function startQuiz() {
    setCurrentIdx(0)
    setPhase('playing')
  }

  function selectOption(idx: number) {
    if (phase !== 'playing') return
    setAnswers((prev) => {
      const next = [...prev]
      next[currentIdx] = idx
      return next
    })
  }

  function nextQuestion() {
    if (!mod) return
    if (currentIdx + 1 < mod.questions.length) {
      setCurrentIdx(currentIdx + 1)
    } else {
      submitQuiz()
    }
  }

  function previousQuestion() {
    if (currentIdx > 0) setCurrentIdx(currentIdx - 1)
  }

  function submitQuiz() {
    if (!mod) return
    setPhase('submitting')
    contentApi
      .gradeQuiz(mod.id, answers.map((a) => (a < 0 ? 0 : a)))
      .then((g) => {
        setGrade(g)
        setPhase('review')
      })
      .catch((err) => {
        setErrorMsg(messageOf(err))
        setPhase('error')
      })
  }

  function restart() {
    if (!mod) return
    setAnswers(new Array(mod.questions.length).fill(-1))
    setCurrentIdx(0)
    setGrade(null)
    setPhase('onboarding')
  }

  if (phase === 'loading') {
    return (
      <div className="flex h-[60dvh] items-center justify-center">
        <LoaderPinwheel size={28} className="animate-spin text-text-muted" />
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <p className="mb-4 text-text-muted">{errorMsg}</p>
        <Link to="/quiz" className="inline-flex items-center gap-1 text-primary hover:underline">
          <ArrowLeft size={16} strokeWidth={1.9} /> Kembali ke daftar kuis
        </Link>
      </div>
    )
  }

  if (!mod) return null

  // === ONBOARDING ===
  if (phase === 'onboarding') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link to="/quiz" className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted hover:text-text">
          <ArrowLeft size={16} strokeWidth={1.9} /> Daftar kuis
        </Link>

        <div className="rounded-lg border border-border bg-bg-surface p-6 sm:p-8">
          <span className="inline-flex mb-3 rounded-full bg-bg-raised px-2 py-1 text-xs font-medium uppercase tracking-wider text-accent">
            Onboarding
          </span>
          <h1 className="font-display text-2xl tracking-wide">{mod.title}</h1>
          <p className="mb-6 text-sm text-text-muted">{mod.summary}</p>

          <div className="mb-6 space-y-3 rounded-md bg-bg-raised p-4 text-sm">
            <Row icon={<BookOpen size={16} className="text-text-muted" strokeWidth={1.9} />} label="Jumlah soal">
              {mod.questions.length} soal
            </Row>
            <Row icon={<Timer size={16} className="text-text-muted" strokeWidth={1.9} />} label="Waktu">
              Tidak ada batas waktu - fokus pada ketepatan jawaban.
            </Row>
            <Row icon={<Trophy size={16} className="text-text-muted" strokeWidth={1.9} />} label="Penilaian">
              Hasil dan pembahasan muncul setelah kamu menyelesaikan semua soal.
            </Row>
          </div>

          <button
            onClick={startQuiz}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-bold text-on-primary transition-colors hover:bg-primary-hover"
          >
            Mulai Kuis <PlayingCards  size={18} strokeWidth={1.9} />
          </button>
        </div>
      </div>
    )
  }

  // === PLAYING ===
  if (phase === 'playing' && currentQ) {
    const isLast = currentIdx === mod.questions.length - 1
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        {/* Progress bar */}
        <div className="mb-4">
          <div className="mb-1.5 flex justify-between text-xs text-text-muted">
            <span>Progress</span>
            <span>{answeredCount}/{mod.questions.length}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-bg-raised">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(answeredCount / mod.questions.length) * 100}%` }}
            />
          </div>
        </div>

        <QuizCard
          questionIndex={currentIdx}
          totalQuestions={mod.questions.length}
          questionText={currentQ.text}
          options={currentQ.options}
          selectedIndex={selected !== undefined && selected >= 0 ? selected : undefined}
          onSelect={selectOption}
          showSubmit={true}
          onSubmit={nextQuestion}
        />

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={previousQuestion}
            disabled={currentIdx === 0}
            className="inline-flex items-center gap-1 rounded-md border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:text-text disabled:opacity-40"
          >
            <ArrowLeft size={16} strokeWidth={1.9} /> Sebelumnya
          </button>
          <button
            onClick={isLast ? submitQuiz : nextQuestion}
            disabled={selected === undefined || selected < 0}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary disabled:opacity-50"
          >
            {isLast ? 'Selesai' : 'Berikutnya'} <ArrowRight size={16} strokeWidth={1.9} />
          </button>
        </div>

        {/* Force-submit safety net */}
        <button
          onClick={submitQuiz}
          disabled={!allAnswered}
          className="mt-3 w-full rounded-md border border-border py-2 text-xs text-text-muted transition-colors hover:text-text disabled:opacity-40"
        >
          {allAnswered
            ? 'Selesaikan sekarang'
            : `Jawab semua soal dulu (${mod.questions.length - answeredCount} tersisa)`}
        </button>
      </div>
    )
  }

  // === SUBMITTING ===
  if (phase === 'submitting') {
    return (
      <div className="flex h-[60dvh] flex-col items-center justify-center gap-3 text-text-muted">
        <LoaderPinwheel size={28} className="animate-spin" />
        <p className="text-sm">Menilai jawaban...</p>
      </div>
    )
  }

  // === REVIEW ===
  if (phase === 'review' && grade) {
    const { score } = grade
    const msg = getMessage(score.percentage)
    const passed = score.percentage >= 60

    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link to="/quiz" className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted hover:text-text">
          <ArrowLeft size={16} strokeWidth={1.9} /> Daftar kuis
        </Link>

        {/* Score hero */}
        <div className="mb-6 rounded-lg border border-border bg-bg-surface p-6 text-center">
          <div
            className={`mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full ${
              passed ? 'bg-primary/15 text-primary' : 'bg-danger/15 text-danger'
            }`}
          >
            {passed ? <Trophy size={32} strokeWidth={1.9} /> : <RotateCcw size={32} strokeWidth={1.9} />}
          </div>
          <h1 className="font-display mb-1 text-2xl tracking-wide">{msg.title}</h1>
          <p className="mb-4 text-sm text-text-muted">{msg.subtitle}</p>
          <div className="text-4xl font-bold tabular-nums">
            <span className={passed ? 'text-primary' : 'text-danger'}>{score.correct}</span>
            <span className="text-text-muted">/{score.total}</span>
          </div>
          <p className="mt-1 text-sm text-text-muted">Skor: {score.percentage}%</p>
        </div>

        {/* Detail per soal */}
        <h2 className="font-display mb-3 text-lg">Ulasan Jawaban</h2>
        <div className="space-y-3">
          {grade.results.map((r) => (
            <div
              key={r.questionIndex}
              className={`rounded-lg border p-4 ${
                r.isCorrect ? 'border-primary/30 bg-primary/5' : 'border-danger/30 bg-danger/5'
              }`}
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <p className="text-sm font-medium">
                  <span className="text-text-muted">#{r.questionIndex + 1}</span>{' '}
                  <RichText text={r.questionText} />
                </p>
                <span className={r.isCorrect ? 'text-primary' : 'text-danger'}>
                  {r.isCorrect ? <CheckCircle2 size={18} strokeWidth={1.9} /> : <XCircle size={18} strokeWidth={1.9} />}
                </span>
              </div>

              <div className="mb-2 grid gap-1.5 text-sm">
                {r.options.map((opt, i) => {
                  const isCorrect = i === r.correctAnswer
                  const isUserPick = i === r.userAnswer
                  let cls = 'border-border bg-bg-raised text-text-muted'
                  if (isCorrect) cls = 'border-primary bg-primary/10 text-primary'
                  else if (isUserPick && !r.isCorrect) cls = 'border-danger bg-danger/10 text-danger'
                  return (
                    <div key={i} className={`flex items-center justify-between rounded-md border px-3 py-2 ${cls}`}>
                      <span>
                        <strong className="mr-1">{String.fromCharCode(65 + i)}.</strong>
                        <RichText text={opt} />
                      </span>
                      {isCorrect && <CheckCircle2 size={14} className="text-primary" strokeWidth={2} />}
                      {isUserPick && !r.isCorrect && <XCircle size={14} className="text-danger" strokeWidth={2} />}
                    </div>
                  )
                })}
              </div>

              {r.userAnswer === null && (
                <p className="mb-2 text-xs italic text-text-muted">(Tidak dijawab)</p>
              )}
              {r.explanation && (
                <p className="rounded-md bg-bg-raised p-2 text-xs text-text-muted">
                  <strong className="text-text">Penjelasan: </strong>
                  <RichText text={r.explanation} />
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            onClick={restart}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-text transition-colors hover:bg-bg-raised"
          >
            <RotateCcw size={16} strokeWidth={1.9} /> Coba Lagi
          </button>
          <Link
            to={`/antrean/${mod.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-on-primary transition-colors hover:bg-primary-hover"
          >
            <Swords size={18} strokeWidth={1.9} /> Tantang Lawan
          </Link>
        </div>
      </div>
    )
  }

  return null
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-text-muted">
        {icon}
        <span>{label}</span>
      </div>
      <span className="text-text">{children}</span>
    </div>
  )
}