'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  FileUp, Settings, User, CheckCircle, ArrowRight, ArrowLeft, Printer,
} from 'lucide-react';
import { Button, Input, Textarea, Toggle } from '@/components/ui';
import { FileUploadZone, type UploadedFile } from '@/components/order/FileUpload';
import { PriceCalculator } from '@/components/order/PriceCalculator';
import { cn } from '@/lib/utils';
import type { PaperSize, ColourMode, BindingType } from '@/types';
import { PAPER_SIZE_DIMS, BINDING_LABELS } from '@/types';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderFormData {
  // Step 1: Files
  files: UploadedFile[];
  // Step 2: Specs
  paper_size: PaperSize;
  colour_mode: ColourMode;
  copies: number;
  double_sided: boolean;
  binding: BindingType;
  pages: number;
  // Step 3: Contact
  student_name: string;
  student_phone: string;
  student_email: string;
  student_notes: string;
}

const STEPS = [
  { id: 'files',   label: 'Upload Files', icon: FileUp },
  { id: 'specs',   label: 'Print Options', icon: Settings },
  { id: 'contact', label: 'Your Details', icon: User },
  { id: 'confirm', label: 'Confirm', icon: CheckCircle },
];

const PAPER_SIZES: PaperSize[] = ['A4', 'A3', 'A2', 'A1', 'A0', 'A5'];

const DEFAULT_FORM: OrderFormData = {
  files: [],
  paper_size: 'A4',
  colour_mode: 'blackwhite',
  copies: 1,
  double_sided: false,
  binding: 'none',
  pages: 1,
  student_name: '',
  student_phone: '',
  student_email: '',
  student_notes: '',
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OrderPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<OrderFormData>(DEFAULT_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof OrderFormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  const update = <K extends keyof OrderFormData>(key: K, val: OrderFormData[K]) =>
    setForm(f => ({ ...f, [key]: val }));

  // ── Validation ────────────────────────────────────────────────────────────

  const validateStep = (s: number): boolean => {
    const e: typeof errors = {};
    if (s === 0) {
      if (form.files.length === 0) e.files = 'Please upload at least one file.';
    }
    if (s === 1) {
      if (!form.pages || form.pages < 1) e.pages = 'Enter the number of pages.';
      if (form.copies < 1 || form.copies > 100) e.copies = 'Copies must be between 1 and 100.';
    }
    if (s === 2) {
      if (!form.student_name.trim()) e.student_name = 'Your name is required.';
      if (!form.student_phone.trim()) e.student_phone = 'Phone number is required.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validateStep(step)) setStep(s => s + 1); };
  const prev = () => setStep(s => s - 1);

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // 1. Upload files to Supabase Storage via API
      const uploadedFiles = await uploadFiles(form.files);

      // 2. Create order
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_id: process.env.NEXT_PUBLIC_DEFAULT_SHOP_ID ?? 'default',
          student_name:  form.student_name.trim(),
          student_phone: form.student_phone.trim(),
          student_email: form.student_email.trim() || undefined,
          student_notes: form.student_notes.trim() || undefined,
          paper_size:    form.paper_size,
          colour_mode:   form.colour_mode,
          copies:        form.copies,
          double_sided:  form.double_sided,
          binding:       form.binding,
          files:         uploadedFiles,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to place order');
      }

      const { order } = await res.json();
      setOrderNumber(order.order_number);
      setStep(4); // success screen
      toast.success('Order placed!');
    } catch (err: any) {
      toast.error(err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── File upload helper ────────────────────────────────────────────────────

  const uploadFiles = async (files: UploadedFile[]) => {
    const results = [];
    for (const f of files) {
      const formData = new FormData();
      formData.append('file', f.file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error(`Failed to upload ${f.file.name}`);
      const data = await res.json();
      results.push({
        name: f.file.name,
        size: f.file.size,
        url: data.url,
        storage_path: data.storage_path,
      });
    }
    return results;
  };

  // ── Success screen ────────────────────────────────────────────────────────

  if (step === 4 && orderNumber) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <h1 className="font-display text-3xl font-bold text-navy-900 mb-3">
            Order placed!
          </h1>
          <p className="text-stone-500 mb-2">
            Your prints are in the queue. We'll notify you when they're ready.
          </p>
          <div className="mt-4 mb-8 inline-flex items-center gap-2 bg-navy-50 border border-navy-200 rounded-2xl px-5 py-3">
            <span className="text-sm text-stone-500">Order number</span>
            <span className="font-mono font-bold text-navy-700 text-lg">{orderNumber}</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href={`/track/${orderNumber}`} className="btn-primary flex-1 justify-center py-3">
              Track my order
            </Link>
            <button
              onClick={() => { setForm(DEFAULT_FORM); setStep(0); setOrderNumber(''); }}
              className="btn-outline flex-1 py-3"
            >
              Place another
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Layout ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-white border-b border-stone-200">
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-7 h-7 bg-navy-700 rounded-lg flex items-center justify-center">
              <Printer className="w-3.5 h-3.5 text-amber-400" />
            </span>
            <span className="font-display font-bold text-navy-700">PrintFlow</span>
          </Link>
          <Link href={`/track`} className="text-sm text-stone-500 hover:text-navy-700 transition-colors">
            Track existing order →
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Step indicators */}
        <div className="mb-8">
          <div className="flex items-center gap-0">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 font-medium text-sm',
                    i < step  ? 'bg-emerald-500 text-white' :
                    i === step ? 'bg-navy-700 text-white ring-4 ring-navy-100' :
                    'bg-stone-200 text-stone-500',
                  )}>
                    {i < step ? '✓' : i + 1}
                  </div>
                  <span className={cn(
                    'text-xs mt-1.5 font-medium hidden sm:block whitespace-nowrap',
                    i === step ? 'text-navy-700' : 'text-stone-400',
                  )}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn(
                    'flex-1 h-0.5 mx-2 mb-4 transition-colors',
                    i < step ? 'bg-emerald-400' : 'bg-stone-200',
                  )} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="card p-6">
              {step === 0 && <StepFiles form={form} update={update} errors={errors} />}
              {step === 1 && <StepSpecs form={form} update={update} errors={errors} />}
              {step === 2 && <StepContact form={form} update={update} errors={errors} />}
              {step === 3 && <StepConfirm form={form} />}
            </div>

            {/* Navigation */}
            <div className="flex gap-3 mt-4">
              {step > 0 && (
                <Button variant="outline" onClick={prev} icon={<ArrowLeft className="w-4 h-4" />}>
                  Back
                </Button>
              )}
              <div className="flex-1" />
              {step < 3 ? (
                <Button variant="accent" onClick={next} icon={<ArrowRight className="w-4 h-4" />} iconPosition="right">
                  Continue
                </Button>
              ) : (
                <Button
                  variant="accent"
                  size="lg"
                  onClick={handleSubmit}
                  loading={submitting}
                  icon={<CheckCircle className="w-4 h-4" />}
                >
                  Place Order
                </Button>
              )}
            </div>
          </div>

          {/* Price summary sidebar */}
          {(step === 1 || step === 3) && (
            <div>
              <PriceCalculator
                paper_size={form.paper_size}
                colour_mode={form.colour_mode}
                copies={form.copies}
                pages={form.pages}
                double_sided={form.double_sided}
                binding={form.binding}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step components ──────────────────────────────────────────────────────────

function StepFiles({
  form, update, errors,
}: {
  form: OrderFormData;
  update: <K extends keyof OrderFormData>(k: K, v: OrderFormData[K]) => void;
  errors: Partial<Record<keyof OrderFormData, string>>;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-semibold text-navy-900">Upload your files</h2>
        <p className="text-stone-500 text-sm mt-1">
          Upload your print files. PDF is recommended for best results.
        </p>
      </div>
      <FileUploadZone
        files={form.files}
        onFilesChange={files => update('files', files)}
      />
      {errors.files && (
        <p className="field-error">{errors.files}</p>
      )}
    </div>
  );
}

function StepSpecs({
  form, update, errors,
}: {
  form: OrderFormData;
  update: <K extends keyof OrderFormData>(k: K, v: OrderFormData[K]) => void;
  errors: Partial<Record<keyof OrderFormData, string>>;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-navy-900">Print options</h2>
        <p className="text-stone-500 text-sm mt-1">
          Choose exactly how you need your documents printed.
        </p>
      </div>

      {/* Paper size */}
      <div>
        <label className="label">Paper Size *</label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {PAPER_SIZES.map(size => (
            <button
              key={size}
              type="button"
              onClick={() => update('paper_size', size)}
              className={cn(
                'rounded-xl border-2 p-3 text-center transition-all duration-150',
                form.paper_size === size
                  ? 'border-navy-600 bg-navy-50 text-navy-700'
                  : 'border-stone-200 hover:border-stone-300 text-stone-600',
              )}
            >
              <div className="font-bold text-sm">{size}</div>
              <div className="text-xs text-stone-400 mt-0.5 leading-tight">
                {PAPER_SIZE_DIMS[size].split(' ×')[0]}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Colour mode */}
      <div>
        <label className="label">Colour Mode *</label>
        <div className="grid grid-cols-2 gap-3">
          {([
            { value: 'blackwhite', label: '⚫ Black & White', desc: 'Standard, cheaper' },
            { value: 'colour',     label: '🎨 Full Colour',   desc: 'Vivid, higher quality' },
          ] as const).map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update('colour_mode', opt.value)}
              className={cn(
                'rounded-xl border-2 p-4 text-left transition-all duration-150',
                form.colour_mode === opt.value
                  ? 'border-navy-600 bg-navy-50'
                  : 'border-stone-200 hover:border-stone-300',
              )}
            >
              <div className="font-semibold text-stone-800 text-sm">{opt.label}</div>
              <div className="text-xs text-stone-400 mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Pages + Copies */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Number of Pages *"
          type="number"
          min={1}
          max={1000}
          value={form.pages || ''}
          onChange={e => update('pages', parseInt(e.target.value) || 0)}
          error={errors.pages}
          hint="Total pages in your files"
        />
        <Input
          label="Copies *"
          type="number"
          min={1}
          max={100}
          value={form.copies}
          onChange={e => update('copies', parseInt(e.target.value) || 1)}
          error={errors.copies}
          hint="How many copies to print"
        />
      </div>

      {/* Toggles */}
      <div className="space-y-4">
        <Toggle
          checked={form.double_sided}
          onChange={v => update('double_sided', v)}
          label="Double-sided printing"
          description="Prints on both sides of the paper (saves paper)"
        />
      </div>

      {/* Binding */}
      <div>
        <label className="label">Binding</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(Object.entries(BINDING_LABELS) as [BindingType, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => update('binding', key)}
              className={cn(
                'rounded-xl border-2 p-3 text-sm text-left transition-all',
                form.binding === key
                  ? 'border-navy-600 bg-navy-50 text-navy-700'
                  : 'border-stone-200 hover:border-stone-300 text-stone-600',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepContact({
  form, update, errors,
}: {
  form: OrderFormData;
  update: <K extends keyof OrderFormData>(k: K, v: OrderFormData[K]) => void;
  errors: Partial<Record<keyof OrderFormData, string>>;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-navy-900">Your details</h2>
        <p className="text-stone-500 text-sm mt-1">
          So we can label your prints and notify you when they're ready.
        </p>
      </div>

      <Input
        label="Full Name"
        required
        placeholder="e.g. Sarah Al-Rashidi"
        value={form.student_name}
        onChange={e => update('student_name', e.target.value)}
        error={errors.student_name}
      />
      <Input
        label="Phone Number"
        required
        type="tel"
        placeholder="+1 234 567 8900"
        value={form.student_phone}
        onChange={e => update('student_phone', e.target.value)}
        error={errors.student_phone}
        hint="For pickup notification"
      />
      <Input
        label="Email (optional)"
        type="email"
        placeholder="you@university.edu"
        value={form.student_email}
        onChange={e => update('student_email', e.target.value)}
        error={errors.student_email}
      />
      <Textarea
        label="Notes for the print shop (optional)"
        placeholder="e.g. Please fold the A0 sheets, or rush order for 8 AM pickup"
        rows={3}
        value={form.student_notes}
        onChange={e => update('student_notes', e.target.value)}
      />
    </div>
  );
}

function StepConfirm({ form }: { form: OrderFormData }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-navy-900">Review your order</h2>
        <p className="text-stone-500 text-sm mt-1">Check everything looks right before placing your order.</p>
      </div>

      <div className="space-y-3">
        <Section title="Files">
          {form.files.map((f, i) => (
            <div key={i} className="text-sm text-stone-700 flex items-center gap-2">
              <span>📄</span> {f.file.name}
            </div>
          ))}
        </Section>

        <Section title="Print Specs">
          <Row label="Paper"    value={`${form.paper_size} — ${PAPER_SIZE_DIMS[form.paper_size]}`} />
          <Row label="Colour"   value={form.colour_mode === 'colour' ? '🎨 Full Colour' : '⚫ Black & White'} />
          <Row label="Copies"   value={`${form.copies}x`} />
          <Row label="Sides"    value={form.double_sided ? 'Double-sided' : 'Single-sided'} />
          <Row label="Binding"  value={BINDING_LABELS[form.binding]} />
          <Row label="Pages"    value={`${form.pages} pages`} />
        </Section>

        <Section title="Contact">
          <Row label="Name"  value={form.student_name} />
          <Row label="Phone" value={form.student_phone} />
          {form.student_email && <Row label="Email" value={form.student_email} />}
          {form.student_notes && <Row label="Notes" value={form.student_notes} />}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-stone-50 border border-stone-200 overflow-hidden">
      <div className="px-4 py-2 bg-stone-100 border-b border-stone-200">
        <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">{title}</span>
      </div>
      <div className="px-4 py-3 space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 text-sm">
      <span className="text-stone-500">{label}</span>
      <span className="text-stone-800 font-medium text-right">{value}</span>
    </div>
  );
}
