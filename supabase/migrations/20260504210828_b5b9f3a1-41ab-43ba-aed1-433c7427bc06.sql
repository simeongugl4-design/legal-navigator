CREATE TABLE public.case_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  consultation_id UUID,
  filename TEXT NOT NULL,
  file_size_kb INTEGER,
  document_type TEXT,
  summary TEXT,
  extracted_text TEXT,
  facts JSONB NOT NULL DEFAULT '{}'::jsonb,
  simulation_inputs JSONB,
  ocr_used BOOLEAN NOT NULL DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.case_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own case documents"
  ON public.case_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own case documents"
  ON public.case_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own case documents"
  ON public.case_documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own case documents"
  ON public.case_documents FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_case_documents_user_created
  ON public.case_documents (user_id, created_at DESC);

CREATE TRIGGER update_case_documents_updated_at
  BEFORE UPDATE ON public.case_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();