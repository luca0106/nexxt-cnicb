import React, { useEffect, useState } from 'react';
import { Button, Dialog, Field, Input, Select, Textarea, useToast } from '../ui';
import { createDocument } from '../../api/client';

const TYPES = ['Application Form', 'Income Certificate', 'Bank Statement', 'ID Card Copy', 'Utility Bill', 'Credit Bureau Report'];
const EMPTY = { file_name: '', document_type: 'Income Certificate', content_text: '' };

export default function AttachDocumentDialog({ open, onClose, caseData, onAttached }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(EMPTY);
      setErrors({});
    }
  }, [open]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.file_name.trim()) next.file_name = 'Name the file, e.g. Revised_Income_Certificate.';
    if (!form.content_text.trim()) next.content_text = 'Paste the document text so the review can read it.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const name = form.file_name.trim();
      await createDocument({
        case_id: caseData.id,
        file_name: name.toLowerCase().endsWith('.pdf') ? name : `${name}.pdf`,
        document_type: form.document_type,
        file_size_kb: Math.max(1, Math.round(new Blob([form.content_text]).size / 1024)),
        content_text: form.content_text,
      });
      toast({ tone: 'success', title: 'Document attached', description: 'Run the AI review again to include it.' });
      onClose();
      onAttached();
    } catch (err) {
      setErrors({ file_name: 'The document could not be attached. Try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Attach document"
      description={`Adds a document to case #${caseData.case_number}.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="attach-doc-form" loading={saving}>
            Attach document
          </Button>
        </>
      }
    >
      <form id="attach-doc-form" onSubmit={submit} noValidate>
        <Field label="File name" required error={errors.file_name}>
          <Input value={form.file_name} onChange={set('file_name')} placeholder="Revised_Income_Certificate.pdf" autoFocus />
        </Field>
        <Field label="Document type" required>
          <Select value={form.document_type} onChange={set('document_type')}>
            {TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </Field>
        <Field label="Document text" required error={errors.content_text} hint="One line per row. Line numbers are added automatically for citations.">
          <Textarea value={form.content_text} onChange={set('content_text')} rows={7} className="font-mono" />
        </Field>
      </form>
    </Dialog>
  );
}
